import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'ATE Intelligence — Executive Dashboard',
  description:
    'AI-driven cost optimization platform for semiconductor ATE — real-time KPIs, wafer heatmaps, pattern analysis, and AI-powered pattern optimization.',
  keywords: 'ATE, semiconductor, cost optimization, wafer yield, pattern analysis, executive dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Times New Roman is a system font — no external import needed */}
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
