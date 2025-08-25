/**
 * @fileOverview Types for the translate recipe flow.
 * 
 * This file defines the input and output types for the translateRecipe flow.
 */
import { z } from 'genkit';

const RecipeContentSchema = z.object({
  name: z.string().describe('The name of the recipe.'),
  ingredients: z.array(z.string()).describe('The list of ingredients for the recipe.'),
  instructions: z.string().describe('The cooking instructions for the recipe.'),
});

export const TranslateRecipeInputSchema = z.object({
  recipe: RecipeContentSchema,
  targetLanguage: z.string().describe('The language to translate the recipe into (e.g., "es", "fr", "hi").'),
});
export type TranslateRecipeInput = z.infer<typeof TranslateRecipeInputSchema>;

export const TranslateRecipeOutputSchema = z.object({
  translatedRecipe: RecipeContentSchema.describe('The recipe content translated into the target language.'),
});
export type TranslateRecipeOutput = z.infer<typeof TranslateRecipeOutputSchema>;
