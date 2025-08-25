
'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting ingredients from a grocery receipt image.
 *
 * It takes an image of a receipt as input and returns a list of ingredients.
 * The file exports:
 *   - extractIngredients - The main function to call to extract ingredients from a receipt image.
 */

import {ai} from '@/ai/genkit';
import {
    ExtractIngredientsInput,
    ExtractIngredientsInputSchema,
    ExtractIngredientsOutput,
    ExtractIngredientsOutputSchema
} from '@/ai/types/extract-ingredients-from-receipt';
import { format } from 'date-fns';

export async function extractIngredients(input: ExtractIngredientsInput): Promise<ExtractIngredientsOutput> {
    return extractIngredientsFlow(input);
}

const extractIngredientsPrompt = ai.definePrompt({
  name: 'extractIngredientsPrompt',
  input: {schema: ExtractIngredientsInputSchema},
  output: {schema: ExtractIngredientsOutputSchema},
  prompt: `You are an expert assistant that extracts food item information from an image of pantry items or a grocery receipt and organizes it into a structured format.

Analyze the image provided. For each food item you identify, you MUST provide the following details:

1.  **name**: The name of the ingredient (e.g., Bell Pepper, Tomato). MUST be concise.
2.  **quantity**: The quantity of the ingredient. If it's from a receipt, use the quantity shown. If it's a photo of items, estimate the quantity. It MUST be a number.
3.  **expirationDate**: An estimated expiration date based on the ingredient's typical shelf life, assuming it was purchased today. Today's date is {{currentDate}}. Format the date as YYYY-MM-DD.

**IMPORTANT RULES:**
- ✅ For the expirationDate, provide ONLY the date. Do not add any extra words.
- ✅ Keep the output for each field extremely concise and readable.
- ✅ DO NOT add any conversational text, warnings, or extra paragraphs. Only return the structured data.

Image: {{media url=receiptDataUri}}
`,
});

const extractIngredientsFlow = ai.defineFlow(
  {
    name: 'extractIngredientsFlow',
    inputSchema: ExtractIngredientsInputSchema,
    outputSchema: ExtractIngredientsOutputSchema,
  },
  async input => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const {output} = await extractIngredientsPrompt({
        ...input,
        // @ts-ignore
        currentDate,
    });
    return output!;
  }
);

    