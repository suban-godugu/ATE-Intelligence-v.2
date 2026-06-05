import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    
    // In NestJS ws adapter, query parameters can be extracted from client.upgradeReq or request / url.
    const request = client.upgradeReq || client.request;
    let urlString = '';

    if (request && request.url) {
      urlString = request.url;
    } else if (client.url) {
      urlString = client.url;
    }

    if (!urlString) {
      throw new WsException('Unauthorized');
    }

    try {
      const url = new URL(urlString, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token);
      client.user = payload;
      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }
}
