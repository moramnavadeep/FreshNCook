
/**
 * @fileOverview Types for the extract ingredients from receipt flow.
 * 
 * This file defines the input and output types for the extractIngredients flow.
 * It exports:
 * - ExtractIngredientsInputSchema - The Zod schema for the input.
 * - ExtractIngredientsInput - The TypeScript type for the input.
 * - ExtractIngredientsOutputSchema - The Zod schema for the output.
 * - ExtractIngredientsOutput - The TypeScript type for the output.
 */
import {z} from 'genkit';

export const ExtractIngredientsInputSchema = z.object({
  receiptDataUri: z
    .string()
    .describe(
      'A photo of grocery items or a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' /* data uri */
    ),
});
export type ExtractIngredientsInput = z.infer<typeof ExtractIngredientsInputSchema>;

const IngredientSchema = z.object({
  name: z.string().describe('The name of the ingredient.'),
  quantity: z.number().describe('The quantity of the ingredient.'),
  expirationDate: z.string().optional().describe("The estimated expiration date in 'YYYY-MM-DD' format based on common shelf life."),
});

export const ExtractIngredientsOutputSchema = z.object({
  ingredients: z
    .array(IngredientSchema)
    .describe('A list of ingredients extracted from the image.'),
});
export type ExtractIngredientsOutput = z.infer<typeof ExtractIngredientsOutputSchema>;

    