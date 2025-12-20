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

interface VoiceEntry {
  id?: string;
  name?: string;
}

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
      const voicesRes = await fetch(`${chatterboxUrl}/voices`, {
        signal: AbortSignal.timeout(5000),
      });
      if (voicesRes.ok) {
        const voicesData = await voicesRes.json();
        const voices = voicesData.map((v: string | VoiceEntry) =>
          typeof v === 'string' ? v : (v.id || v.name || String(v))
        );

        providers.push({
          id: 'chatterbox',
          name: 'Chatterbox',
          voices,
          models: ['chatterbox'],
          defaultVoice: voices[0] || 'default',
          defaultModel: 'chatterbox',
          speakerModes: ['article', 'dialog'],
          defaultSpeakerMode: 'article',
          defaultDialogVoices: voices.length >= 2 ? [voices[0], voices[1]] : [voices[0], voices[0]],
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
