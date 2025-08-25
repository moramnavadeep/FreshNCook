'use server';
/**
 * @fileOverview A flow to generate an image for a recipe.
 *
 * - generateRecipeImage - A function that generates an image based on a recipe name.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateRecipeImageInput,
    GenerateRecipeImageInputSchema,
    GenerateRecipeImageOutput,
    GenerateRecipeImageOutputSchema
} from '@/ai/types/generate-recipe-image';


export async function generateRecipeImage(recipeName: GenerateRecipeImageInput): Promise<GenerateRecipeImageOutput> {
  return generateRecipeImageFlow(recipeName);
}

const generateRecipeImageFlow = ai.defineFlow(
  {
    name: 'generateRecipeImageFlow',
    inputSchema: GenerateRecipeImageInputSchema,
    outputSchema: GenerateRecipeImageOutputSchema,
  },
  async (recipeName) => {
    const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `A delicious-looking, professionally photographed image of "${recipeName}" on a plate, ready to eat.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    return {
      imageUrl: media.url,
    };
  }
);
