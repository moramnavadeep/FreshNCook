/**
 * @fileOverview Types for the generate recipe audio flow.
 * 
 * This file defines the input and output types for the generateRecipeAudio flow.
 */
import { z } from 'genkit';

export const GenerateRecipeAudioInputSchema = z.object({
  text: z.string().describe('The recipe text to convert to speech.'),
  language: z.string().describe('The language code for the audio output (e.g., "en", "es").'),
});
export type GenerateRecipeAudioInput = z.infer<typeof GenerateRecipeAudioInputSchema>;

export const GenerateRecipeAudioOutputSchema = z.object({
    audioUrl: z.string().describe('URL of the generated audio file as a data URI.'),
});
export type GenerateRecipeAudioOutput = z.infer<typeof GenerateRecipeAudioOutputSchema>;
