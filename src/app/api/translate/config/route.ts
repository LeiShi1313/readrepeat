import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/translate';

export async function GET() {
  const providers = getAvailableProviders();

  return NextResponse.json({
    available: providers.length > 0,
    providers,
  });
}
