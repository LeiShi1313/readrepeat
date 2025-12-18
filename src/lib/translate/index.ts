import { TranslationProvider, ProviderInfo } from './types';
import { createDeepLProvider } from './providers/deepl';

// Registry of available translation providers
const providers: Map<string, TranslationProvider> = new Map();

// Initialize providers based on environment variables
function initializeProviders() {
  // Clear existing providers
  providers.clear();

  // DeepL
  const deeplKey = process.env.DEEPL_API_KEY;
  if (deeplKey && deeplKey.trim().length > 0) {
    const deepl = createDeepLProvider(deeplKey);
    providers.set(deepl.id, deepl);
  }

  // Add more providers here as they become available:
  // const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  // if (googleKey && googleKey.trim().length > 0) {
  //   const google = createGoogleProvider(googleKey);
  //   providers.set(google.id, google);
  // }
}

// Get list of available providers (for frontend display)
export function getAvailableProviders(): ProviderInfo[] {
  initializeProviders();
  return Array.from(providers.values()).map(p => ({
    id: p.id,
    name: p.name,
  }));
}

// Get a specific provider by ID
export function getProvider(providerId: string): TranslationProvider | undefined {
  initializeProviders();
  return providers.get(providerId);
}

// Check if any providers are available
export function hasProviders(): boolean {
  initializeProviders();
  return providers.size > 0;
}

export type { TranslationProvider, TranslateRequest, TranslateResponse, ProviderInfo } from './types';
