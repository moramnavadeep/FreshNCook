'use server';
/**
 * @fileOverview A flow to generate a detailed cooking plan for a given recipe.
 * 
 * - generateRecipePlan - A function that takes a recipe name and returns a structured cooking plan.
 */

import { ai } from '@/ai/genkit';
import {
  GenerateRecipePlanInputSchema,
  GenerateRecipePlanOutputSchema,
  GenerateRecipePlanInput,
  GenerateRecipePlanOutput,
} from '@/ai/types/generate-recipe-plan';

export async function generateRecipePlan(input: GenerateRecipePlanInput): Promise<GenerateRecipePlanOutput> {
  return generateRecipePlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecipePlanPrompt',
  input: { schema: GenerateRecipePlanInputSchema },
  output: { schema: GenerateRecipePlanOutputSchema },
  prompt: `You are a master chef. A user wants to cook "{{recipeName}}".
  
  Create a detailed, step-by-step plan and workflow for preparing this dish.
  
  Your plan should include:
  1.  A brief, enticing description of the final dish.
  2.  A list of all necessary ingredients.
  3.  A sequence of clear, actionable steps from preparation to plating.
  
  Present the plan in a structured format.`,
});

const generateRecipePlanFlow = ai.defineFlow(
  {
    name: 'generateRecipePlanFlow',
    inputSchema: GenerateRecipePlanInputSchema,
    outputSchema: GenerateRecipePlanOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
