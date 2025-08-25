'use server';
/**
 * @fileOverview Recipe suggestion flow based on extracted ingredients.
 *
 * - suggestRecipes - A function that suggests recipes based on ingredients.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    SuggestRecipesInput, 
    SuggestRecipesInputSchema, 
    SuggestRecipesOutput, 
    SuggestRecipesOutputSchema
} from '@/ai/types/suggest-recipes-from-ingredients';

export async function suggestRecipes(input: SuggestRecipesInput): Promise<SuggestRecipesOutput> {
  return suggestRecipesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRecipesPrompt',
  input: {schema: SuggestRecipesInputSchema},
  output: {schema: SuggestRecipesOutputSchema},
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
        },
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH',
        }
    ],
  },
  prompt: `You are a recipe suggestion expert. Given a list of ingredients, suggest 5 diverse recipes.
You MUST ONLY use the ingredients provided in the list. Do not add any other major ingredients, especially meats, fish, or poultry, if they are not on the list. You can assume common pantry staples like oil, salt, and pepper are available.
{{#if cuisine}}
The user has requested recipes from the following cuisine: {{cuisine}}. Please prioritize recipes from this cuisine.
{{/if}}
{{#if category}}
The user has requested recipes for the following meal category: {{category}}. Please prioritize recipes for this meal type.
{{/if}}
{{#if favoriteRecipes}}
The user has indicated they like the following recipes. Use these as inspiration for your suggestions, tailoring them to their tastes (e.g., similar cuisine, style, or ingredients).
Favorite Recipes:
{{#each favoriteRecipes}}- {{this}}\n{{/each}}
{{/if}}

Ingredients:
{{#each ingredients}}- {{this}}\n{{/each}}
{{#if additionalIngredients}}
Additional Ingredients:
{{#each additionalIngredients}}- {{this}}\n{{/each}}
{{/if}}

For each recipe, provide the name, ingredients, and instructions.
Format the output as a JSON object that matches the schema.
`,
});

const suggestRecipesFlow = ai.defineFlow(
  {
    name: 'suggestRecipesFlow',
    inputSchema: SuggestRecipesInputSchema,
    outputSchema: SuggestRecipesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);

    if (!output) {
        return { recipes: [] };
    }

    // Add placeholder images to recipes that don't have one
    output.recipes = output.recipes.map(recipe => ({
        ...recipe,
        imageUrl: recipe.imageUrl || `https://placehold.co/600x400.png`
    }));

    return output;
  }
);
