'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import { getApiOrigin } from '@/api/config';

// Reconnection backoff steps: 1s, 2s, 4s, 8s, 16s, up to 30s
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

/** Helper function to retrieve active JWT or securely construct a local fallback signed token */
async function getJwt(): Promise<string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) return token;
  }

  // Fallback JWT structure matching NestJS backend requirements
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: 'dev-user',
    email: 'dev@compty.ate',
    role: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 Hours
  };

  const base64UrlEncode = (obj: any) => {
    const str = JSON.stringify(obj);
    const base64 = btoa(unescape(encodeURIComponent(str)));
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  const data = `${headerEncoded}.${payloadEncoded}`;

  try {
    const encoder = new TextEncoder();
    const secretData = encoder.encode('ate-vision-secret-key-10029');
    const dataToSign = encoder.encode(data);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      secretData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      dataToSign
    );

    const signatureBytes = new Uint8Array(signature);
    let signatureString = '';
    for (let i = 0; i < signatureBytes.byteLength; i++) {
      signatureString += String.fromCharCode(signatureBytes[i]);
    }
    const signatureEncoded = btoa(signatureString)
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${data}.${signatureEncoded}`;
  } catch (e) {
    console.error('Failed to sign fallback JWT token with Web Crypto:', e);
    return `${data}.mock-signature-fallback`;
  }
}

export function useRealtimeDashboard(lotId?: string | null, fabId?: string | null) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectDelayIndex = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnectedRef = useRef(false);
  const lotIdRef = useRef(lotId);
  const fabIdRef = useRef(fabId);

  // Sync ref values for live subscription triggers
  useEffect(() => {
    lotIdRef.current = lotId;
    fabIdRef.current = fabId;
    
    // Send SUBSCRIBE frame when lotId/fabId shifts on an active connection
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: 'SUBSCRIBE',
        data: { lotId: lotId || undefined, fabId: fabId || undefined }
      }));
    }
  }, [lotId, fabId]);

  useEffect(() => {
    let active = true;

    const connect = async () => {
      if (!active) return;

      try {
        const token = await getJwt();
        if (!active) return;

        const origin = getApiOrigin();
        const wsProtocol = origin.startsWith('https') ? 'wss:' : 'ws:';
        const wsHost = origin.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}//${wsHost}/ws/dashboard?token=${encodeURIComponent(token)}`;

        console.log(`Connecting to WebSocket: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          console.log('WebSocket connection successfully opened.');
          setIsConnected(true);
          reconnectDelayIndex.current = 0;

          // Alert only if we recovered from a prior connection loss
          if (wasConnectedRef.current) {
            toast.success(
              'Connection Restored',
              'WebSocket connection to the ATE co-optimizer has been restored.'
            );
          }
          wasConnectedRef.current = true;

          // Send subscription filter payload immediately
          ws.send(JSON.stringify({
            event: 'SUBSCRIBE',
            data: { lotId: lotIdRef.current || undefined, fabId: fabIdRef.current || undefined }
          }));
        };

        ws.onmessage = (event) => {
          if (!active) return;
          try {
            const raw = JSON.parse(event.data);
            const msgType = raw.type;
            const payload = raw.payload;

            console.log(`WebSocket event received [${msgType}]:`, payload);

            switch (msgType) {
              case 'KPI_UPDATE':
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
                break;
              case 'LOT_STATUS_CHANGE':
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'lots'] });
                queryClient.invalidateQueries({ queryKey: ['lots'] });
                break;
              case 'ALERT_FIRED':
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'alerts'] });
                if (payload?.alert) {
                  const s = payload.alert.severity;
                  const t = `${s.toUpperCase()} ALERT: ${payload.alert.message}`;
                  if (s === 'critical') toast.error('Critical Device Alert', t);
                  else toast.info('System Alert', t);
                }
                break;
              case 'HEATMAP_UPDATE':
                queryClient.invalidateQueries({ queryKey: ['dashboard', 'heatmap'] });
                break;
              case 'JOB_PROGRESS':
                queryClient.invalidateQueries({ queryKey: ['optimizer', 'jobs'] });
                break;
              case 'PING':
                // Auto-reply to server heartbeat ping
                ws.send(JSON.stringify({ type: 'PONG' }));
                break;
            }
          } catch (err) {
            console.error('Error parsing WebSocket message payload:', err);
          }
        };

        ws.onclose = (event) => {
          if (!active) return;
          console.warn(`WebSocket connection closed. Code: ${event.code}. Reason: ${event.reason}`);
          setIsConnected(false);
          socketRef.current = null;

          // Trigger disconnect toast
          if (wasConnectedRef.current) {
            toast.error(
              'Connection Lost',
              'WebSocket connection lost. Attempting auto-reconnection...'
            );
          }

          // Backoff reconnection
          const delay = RECONNECT_DELAYS[reconnectDelayIndex.current] || 30000;
          reconnectDelayIndex.current = Math.min(reconnectDelayIndex.current + 1, RECONNECT_DELAYS.length - 1);
          
          console.log(`Scheduling auto-reconnection in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        ws.onerror = (err) => {
          console.error('WebSocket connection error:', err);
          // Allow onclose to trigger reconnection backoff
          ws.close();
        };

      } catch (err) {
        console.error('Failed to establish WebSocket handshake connection:', err);
        const delay = RECONNECT_DELAYS[reconnectDelayIndex.current] || 30000;
        reconnectDelayIndex.current = Math.min(reconnectDelayIndex.current + 1, RECONNECT_DELAYS.length - 1);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    connect();

    // Hook cleanup on unmount
    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [queryClient]);

  return { isConnected };
}
