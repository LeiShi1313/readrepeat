import { NextRequest, NextResponse } from 'next/server';
import { getProvider, getAvailableProviders } from '@/lib/translate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, sourceLang, targetLang, provider: providerId } = body;

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLang, targetLang' },
        { status: 400 }
      );
    }

    // Get available providers
    const availableProviders = getAvailableProviders();
    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: 'No translation services configured' },
        { status: 503 }
      );
    }

    // Use specified provider or default to first available
    const selectedProviderId = providerId || availableProviders[0].id;
    const provider = getProvider(selectedProviderId);

    if (!provider) {
      return NextResponse.json(
        { error: `Translation provider '${selectedProviderId}' not found` },
        { status: 400 }
      );
    }

    const result = await provider.translate({ text, sourceLang, targetLang });

    return NextResponse.json({ translatedText: result.translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    const message = error instanceof Error ? error.message : 'Translation request failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
