/**
 * @fileOverview Types for the suggest recipes from ingredients flow.
 * 
 * This file defines the input and output types for the suggestRecipes flow.
 * It exports:
 * - SuggestRecipesInputSchema - The Zod schema for the input.
 * - SuggestRecipesInput - The TypeScript type for the input.
 * - SuggestRecipesOutputSchema - The Zod schema for the output.
 * - SuggestRecipesOutput - The TypeScript type for the output.
 */
import {z} from 'genkit';

export const SuggestRecipesInputSchema = z.object({
  ingredients: z.array(z.string()).describe('A list of ingredients the user has.'),
  additionalIngredients: z.array(z.string()).optional().describe('A list of additional ingredients to consider.'),
  cuisine: z.string().optional().describe('The desired cuisine (e.g., Italian, Mexican).'),
  category: z.string().optional().describe('The meal category (e.g., Breakfast, Dinner).'),
  favoriteRecipes: z.array(z.string()).optional().describe('A list of the user\'s favorite recipe names to influence suggestions.'),
});
export type SuggestRecipesInput = z.infer<typeof SuggestRecipesInputSchema>;

const RecipeSchema = z.object({
  name: z.string().describe('The name of the recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredient names required for the recipe.'),
  instructions: z.string().describe('Step-by-step instructions for preparing the recipe.'),
  imageUrl: z.string().optional().describe('URL of an image for the recipe.'),
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const SuggestRecipesOutputSchema = z.object({
  recipes: z
    .array(RecipeSchema)
    .describe('A list of suggested recipes.'),
});
export type SuggestRecipesOutput = z.infer<typeof SuggestRecipesOutputSchema>;
