
'use server';

import { extractIngredients } from '@/ai/flows/extract-ingredients-from-receipt';
import { suggestRecipes } from '@/ai/flows/suggest-recipes-from-ingredients';
import { generateRecipeImage } from '@/ai/flows/generate-recipe-image';
import { detectSpoiledVegetable } from '@/ai/flows/detect-spoiled-vegetable';
import { generateRecipePlan } from '@/ai/flows/generate-recipe-plan';
import { generateRecipeAudio } from '@/ai/flows/generate-recipe-audio';
import { translateRecipe } from '@/ai/flows/translate-recipe';

import type { ExtractIngredientsOutput } from '@/ai/types/extract-ingredients-from-receipt';
import type { SuggestRecipesInput, SuggestRecipesOutput, Recipe } from '@/ai/types/suggest-recipes-from-ingredients';
import type { GenerateRecipeImageInput } from '@/ai/types/generate-recipe-image';
import type { DetectSpoiledVegetableInput } from '@/ai/types/detect-spoiled-vegetable';
import type { GenerateRecipePlanInput } from '@/ai/types/generate-recipe-plan';
import type { GenerateRecipeAudioInput } from '@/ai/types/generate-recipe-audio';
import type { TranslateRecipeInput, TranslateRecipeOutput } from '@/ai/types/translate-recipe';
import type { UserProfile } from '@/types/user';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';


export async function handleExtractIngredients(receiptDataUri: string): Promise<ExtractIngredientsOutput> {
  if (!receiptDataUri || !receiptDataUri.startsWith('data:image/')) {
    throw new Error('Invalid receipt image data.');
  }
  const input = { receiptDataUri };
  try {
    const output = await extractIngredients(input);
    if (!output || !output.ingredients) {
        return { ingredients: [] };
    }
    return output;
  } catch (error) {
    console.error('Error extracting ingredients:', error);
    throw new Error('Failed to process receipt. The AI may be experiencing high load. Please try again.');
  }
}

export async function handleSuggestRecipes(ingredients: ExtractIngredientsOutput['ingredients'], additionalIngredients: string[], cuisine: string, category: string, favoriteRecipes: string[]): Promise<SuggestRecipesOutput> {
  if (!ingredients || ingredients.length === 0) {
    throw new Error('No ingredients provided.');
  }
  const ingredientNames = ingredients.map(i => i.name);
  const input: SuggestRecipesInput = { ingredients: ingredientNames, additionalIngredients, cuisine, category, favoriteRecipes };
  try {
    const recipeSuggestions = await suggestRecipes(input);
    return recipeSuggestions;
  } catch (error) {
    console.error('Error suggesting recipes:', error);
    throw new Error('Failed to generate recipe suggestions. The AI may be experiencing high load. Please try again in a moment.');
  }
}

export async function handleGenerateImage(recipeName: string) {
  if (!recipeName) {
    throw new Error('No recipe name provided.');
  }
  const input: GenerateRecipeImageInput = recipeName;
  const output = await generateRecipeImage(input);
  return output;
}

export async function handleDetectSpoilage(vegetableName: string, vegetableImageUri: string) {
  if (!vegetableName || !vegetableImageUri) {
    throw new Error('Vegetable name and image are required.');
  }
  const input: DetectSpoiledVegetableInput = { vegetableName, vegetableImageUri };
  try {
    const output = await detectSpoiledVegetable(input);
    return output;
  } catch (error) {
    console.error('Error detecting spoilage:', error);
    throw new Error('Failed to analyze vegetable. The AI may be experiencing high load. Please try again in a moment.');
  }
}

export async function handleGenerateRecipePlan(recipeName: string) {
    if (!recipeName) {
        throw new Error('Recipe name is required.');
    }
    const input: GenerateRecipePlanInput = { recipeName };
    try {
        const output = await generateRecipePlan(input);
        return output;
    } catch (error) {
        console.error('Error generating recipe plan:', error);
        throw new Error('Failed to generate recipe plan. The AI may be experiencing high load. Please try again.');
    }
}

export async function handleGenerateRecipeAudio(text: string, language: string) {
    if (!text || !language) {
        throw new Error('Text and language are required to generate audio.');
    }
    const input: GenerateRecipeAudioInput = { text, language };
    try {
        const output = await generateRecipeAudio(input);
        return output;
    } catch (error) {
        console.error('Error generating recipe audio:', error);
        throw new Error('Failed to generate recipe audio. Please try again.');
    }
}

export async function handleTranslateRecipe(recipe: Omit<Recipe, 'imageUrl'>, targetLanguage: string): Promise<TranslateRecipeOutput> {
    if (!recipe || !targetLanguage) {
        throw new Error('Recipe content and target language are required.');
    }
    const input: TranslateRecipeInput = { recipe, targetLanguage };
    try {
        const output = await translateRecipe(input);
        return output;
    } catch (error) {
        console.error('Error translating recipe:', error);
        throw new Error('Failed to translate recipe. Please try again.');
    }
}

export async function handleCreateUser(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null; }) {
    if (!user || !user.uid) {
        throw new Error("Invalid user data provided.");
    }
    const userRef = doc(db, 'users', user.uid);
    
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        // Document doesn't exist, create it with initial fields.
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Anonymous User',
            photoURL: user.photoURL || '',
            location: null,
            createdAt: new Date().toISOString(),
        });
    } else {
        // Document exists, merge basic profile info to update it.
        // This won't overwrite `location` or `createdAt` if they already exist.
        await setDoc(userRef, {
           uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Anonymous User',
            photoURL: user.photoURL || '',
        }, { merge: true });
    }
}


export async function handleGetUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            return userDoc.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
}
