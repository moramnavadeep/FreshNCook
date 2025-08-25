import {z} from 'genkit';

export const DetectSpoiledVegetableInputSchema = z.object({
  vegetableName: z.string().describe('The name of the vegetable.'),
  vegetableImageUri: z
    .string()
    .describe(
      "An image of a vegetable, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectSpoiledVegetableInput = z.infer<typeof DetectSpoiledVegetableInputSchema>;

export const DetectSpoiledVegetableOutputSchema = z.object({
  isVegetable: z.boolean().optional().describe('Whether the image contains the specified vegetable.'),
  isSpoiled: z.boolean().optional().describe('Whether the vegetable is likely spoiled or not. This is only relevant if isVegetable is true.'),
  reason: z.string().describe('The reasoning behind the determination.'),
  confidence: z.number().min(0).max(1).optional().describe('The confidence score of the prediction, from 0 to 1. This is only relevant if isVegetable is true.'),
});
export type DetectSpoiledVegetableOutput = z.infer<typeof DetectSpoiledVegetableOutputSchema>;
