/**
 * @fileOverview Types for the generate recipe image flow.
 *
 * This file defines the input and output types for the generateRecipeImage flow.
 * It exports:
 * - GenerateRecipeImageInputSchema - The Zod schema for the input.
 * - GenerateRecipeImageInput - The TypeScript type for the input.
 * - GenerateRecipeImageOutputSchema - The Zod schema for the output.
 * - GenerateRecipeImageOutput - The TypeScript type for the output.
 */
import {z} from 'genkit';

export const GenerateRecipeImageInputSchema = z.string();
export type GenerateRecipeImageInput = z.infer<typeof GenerateRecipeImageInputSchema>;

export const GenerateRecipeImageOutputSchema = z.object({
    imageUrl: z.string().describe('URL of the generated image.'),
});
export type GenerateRecipeImageOutput = z.infer<typeof GenerateRecipeImageOutputSchema>;
