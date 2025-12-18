import { NextResponse } from 'next/server';

// Available voices for Gemini TTS
const GEMINI_VOICES = [
  'Zephyr',   // Bright
  'Puck',     // Upbeat
  'Charon',   // Informative
  'Kore',     // Firm
  'Fenrir',   // Excitable
  'Leda',     // Youthful
  'Orus',     // Firm
  'Aoede',    // Breezy
];

// Available TTS models
const GEMINI_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
];

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiAvailable = Boolean(geminiKey && geminiKey.trim().length > 0);

  const providers = [];

  if (geminiAvailable) {
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      voices: GEMINI_VOICES,
      models: GEMINI_MODELS,
      defaultVoice: 'Zephyr',
      defaultModel: 'gemini-2.5-flash-preview-tts',
      speakerModes: ['article', 'dialog'],
      defaultSpeakerMode: 'article',
      defaultDialogVoices: ['Zephyr', 'Kore'],
    });
  }

  return NextResponse.json({
    available: providers.length > 0,
    providers,
  });
}
