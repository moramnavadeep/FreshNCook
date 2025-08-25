'use server';

import { config } from 'dotenv';
config();

import '@/ai/flows/extract-ingredients-from-receipt.ts';
import '@/ai/flows/suggest-recipes-from-ingredients.ts';
import '@/ai/flows/generate-recipe-image.ts';
import '@/ai/flows/detect-spoiled-vegetable.ts';
import '@/ai/flows/generate-recipe-plan.ts';
import '@/ai/flows/generate-recipe-audio.ts';
import '@/ai/flows/translate-recipe.ts';
