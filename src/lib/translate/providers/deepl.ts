import { TranslationProvider, TranslateRequest, TranslateResponse } from '../types';

const DEEPL_FREE_API = 'https://api-free.deepl.com/v2/translate';
const DEEPL_PRO_API = 'https://api.deepl.com/v2/translate';

function toDeepLLang(lang: string): string {
  return lang.toUpperCase();
}

export function createDeepLProvider(apiKey: string): TranslationProvider {
  // Determine API endpoint based on key type (free keys end with ':fx')
  const apiUrl = apiKey.endsWith(':fx') ? DEEPL_FREE_API : DEEPL_PRO_API;

  return {
    id: 'deepl',
    name: 'DeepL',
    async translate(request: TranslateRequest): Promise<TranslateResponse> {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [request.text],
          source_lang: toDeepLLang(request.sourceLang),
          target_lang: toDeepLLang(request.targetLang),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepL API error:', response.status, errorText);
        throw new Error(`DeepL translation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const translatedText = data.translations?.[0]?.text || '';

      return { translatedText };
    },
  };
}
