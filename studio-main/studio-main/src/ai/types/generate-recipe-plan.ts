/**
 * @fileOverview Types for the generate recipe plan flow.
 * 
 * This file defines the input and output types for the generateRecipePlan flow.
 * It exports:
 * - GenerateRecipePlanInputSchema - The Zod schema for the input.
 * - GenerateRecipePlanInput - The TypeScript type for the input.
 * - GenerateRecipePlanOutputSchema - The Zod schema for the output.
 * - GenerateRecipePlanOutput - The TypeScript type for the output.
 */
import { z } from 'genkit';

export const GenerateRecipePlanInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to generate a plan for.'),
});
export type GenerateRecipePlanInput = z.infer<typeof GenerateRecipePlanInputSchema>;

const PlanStepSchema = z.object({
    stepTitle: z.string().describe('A short, clear title for the cooking step (e.g., "Prepare the Vegetables").'),
    instructions: z.string().describe('Detailed instructions for this step.'),
});

export const GenerateRecipePlanOutputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe.'),
  description: z.string().describe('A brief, enticing description of the final dish.'),
  ingredients: z.array(z.string()).describe('A list of all necessary ingredients for the recipe.'),
  steps: z.array(PlanStepSchema).describe('An array of steps providing the cooking workflow.'),
});
export type GenerateRecipePlanOutput = z.infer<typeof GenerateRecipePlanOutputSchema>;
