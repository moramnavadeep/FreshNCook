'use server';
/**
 * @fileOverview A flow to translate a recipe into a specified language.
 * 
 * - translateRecipe - A function that takes a recipe's text content and a target language,
 *   and returns the translated text for the name, ingredients, and instructions.
 */

import { ai } from '@/ai/genkit';
import {
  TranslateRecipeInputSchema,
  TranslateRecipeOutputSchema,
  TranslateRecipeInput,
  TranslateRecipeOutput,
} from '@/ai/types/translate-recipe';

export async function translateRecipe(input: TranslateRecipeInput): Promise<TranslateRecipeOutput> {
  return translateRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateRecipePrompt',
  input: { schema: TranslateRecipeInputSchema },
  output: { schema: TranslateRecipeOutputSchema },
  prompt: `Translate the following recipe into {{targetLanguage}}.

Recipe Name: {{recipe.name}}
Ingredients:
{{#each recipe.ingredients}}
- {{this}}
{{/each}}

Instructions:
{{recipe.instructions}}

Return the translated content in the specified JSON format. The keys (name, ingredients, instructions) must remain in English.
`,
});

const translateRecipeFlow = ai.defineFlow(
  {
    name: 'translateRecipeFlow',
    inputSchema: TranslateRecipeInputSchema,
    outputSchema: TranslateRecipeOutputSchema,
  },
  async (input) => {
    if (input.targetLanguage === 'en') {
      return { translatedRecipe: input.recipe };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
