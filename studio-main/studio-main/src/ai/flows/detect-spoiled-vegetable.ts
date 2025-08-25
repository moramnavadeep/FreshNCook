'use server';
/**
 * @fileOverview A flow to detect if a vegetable is spoiled from an image.
 *
 * - detectSpoiledVegetable - A function that analyzes a vegetable's image to check for spoilage.
 */

import {ai} from '@/ai/genkit';
import {
    DetectSpoiledVegetableInput, 
    DetectSpoiledVegetableInputSchema, 
    DetectSpoiledVegetableOutput, 
    DetectSpoiledVegetableOutputSchema
} from '@/ai/types/detect-spoiled-vegetable';


export async function detectSpoiledVegetable(input: DetectSpoiledVegetableInput): Promise<DetectSpoiledVegetableOutput> {
  return detectSpoiledVegetableFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectSpoiledVegetablePrompt',
  input: {schema: DetectSpoiledVegetableInputSchema},
  output: {schema: DetectSpoiledVegetableOutputSchema},
  prompt: `You are a food safety expert. Your task is to analyze an image and determine if it contains the specified vegetable and, if so, whether that vegetable is spoiled.

  1. First, determine if the image actually contains the vegetable specified: '{{{vegetableName}}}'. Set the 'isVegetable' field to true or false.
  2. If 'isVegetable' is false, provide a reason and stop. Do not assess for spoilage.
  3. If 'isVegetable' is true, then proceed to analyze the vegetable for spoilage. Look for clear signs like mold, discoloration, mushy texture, or wilting.
  4. Set the 'isSpoiled' field to true or false based on your analysis.
  5. Provide a brief, clear reason for your assessment.
  6. Provide a precise confidence score (0.0 to 1.0) for your spoilage assessment. If 'isVegetable' is false, confidence can be null or 0.

  Vegetable Name: {{{vegetableName}}}
  Image: {{media url=vegetableImageUri}}
  `,
});

const detectSpoiledVegetableFlow = ai.defineFlow(
  {
    name: 'detectSpoiledVegetableFlow',
    inputSchema: DetectSpoiledVegetableInputSchema,
    outputSchema: DetectSpoiledVegetableOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input, { model: 'googleai/gemini-2.0-flash' });
      return output!;
    } catch (err) {
      console.error("Vegetable detection failed:", err, "input:", input);
      return {
        isVegetable: false,
        reason: "Analysis failed. Please try again with a clearer image.",
        confidence: 0.0,
      };
    }
  }
);
