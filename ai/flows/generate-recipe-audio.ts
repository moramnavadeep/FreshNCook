'use server';
/**
 * @fileOverview A flow to generate audio from recipe text (Text-to-Speech).
 * 
 * - generateRecipeAudio - A function that converts recipe instructions to speech.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';
import { GenerateRecipeAudioInput, GenerateRecipeAudioInputSchema, GenerateRecipeAudioOutput, GenerateRecipeAudioOutputSchema } from '@/ai/types/generate-recipe-audio';

export async function generateRecipeAudio(input: GenerateRecipeAudioInput): Promise<GenerateRecipeAudioOutput> {
    return generateRecipeAudioFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const generateRecipeAudioFlow = ai.defineFlow(
  {
    name: 'generateRecipeAudioFlow',
    inputSchema: GenerateRecipeAudioInputSchema,
    outputSchema: GenerateRecipeAudioOutputSchema,
  },
  async ({ text, language }) => {
    const voiceMap: Record<string, string> = {
        'en': 'Algenib', // English
        'es': 'Caelus',  // Spanish
        'fr': 'Electra', // French
        'de': 'Bellatrix', // German
        'it': 'Gemma', // Italian
        'hi': 'Antares', // Hindi
        'bn': 'Arcturus', // Bengali
        'ta': 'Canopus', // Tamil
    };

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceMap[language] || 'Algenib' },
          },
        },
      },
      prompt: text,
    });

    if (!media) {
      throw new Error('No audio media was generated.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);
    
    return {
      audioUrl: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);
