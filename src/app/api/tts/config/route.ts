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
  const providers = [];

  // Check Gemini availability
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
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

  // Check Chatterbox availability
  const chatterboxUrl = process.env.CHATTERBOX_API_URL;
  if (chatterboxUrl && chatterboxUrl.trim().length > 0) {
    try {
      // Check health endpoint to verify Chatterbox is running
      const healthRes = await fetch(`${chatterboxUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (healthRes.ok) {
        // Chatterbox uses voice cloning with a default voice sample
        providers.push({
          id: 'chatterbox',
          name: 'Chatterbox',
          voices: ['default'],
          models: ['chatterbox'],
          defaultVoice: 'default',
          defaultModel: 'chatterbox',
          speakerModes: ['article', 'dialog'],
          defaultSpeakerMode: 'article',
          defaultDialogVoices: ['default', 'default'],
        });
      }
    } catch (error) {
      console.warn('Chatterbox not available:', error);
    }
  }

  return NextResponse.json({
    available: providers.length > 0,
    providers,
  });
}
