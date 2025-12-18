export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslateResponse {
  translatedText: string;
}

export interface TranslationProvider {
  id: string;
  name: string;
  translate: (request: TranslateRequest) => Promise<TranslateResponse>;
}

export interface ProviderInfo {
  id: string;
  name: string;
}
