import { NextResponse } from 'next/server';
import { appConfig, isDev } from '@/lib/env';

export async function GET() {
  const manifest = {
    id: '/',
    name: appConfig.name,
    short_name: appConfig.name,
    description: 'Shadow reading for language learning',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: appConfig.themeColor,
    categories: ['education', 'productivity'],
    icons: isDev
      ? [
          {
            src: '/icon-dev-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-dev-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ]
      : [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
  };

  return NextResponse.json(manifest);
}
