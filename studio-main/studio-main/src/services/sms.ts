'use client';

import React, { useState, useTransition, ChangeEvent, useRef, useEffect } from 'react';
import Image from 'next/image';
import { handleExtractIngredients, handleSuggestRecipes, handleGenerateImage, handleDetectSpoilage, handleGenerateRecipePlan, handleGenerateRecipeAudio, handleTranslateRecipe, handleGetUserProfile } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Leaf, Upload, ChefHat, X, Loader2, Plus, Sparkles, AlertCircle, RotateCcw, Clock, Microscope, Star, Heart, Bot, ClipboardCheck, Video, Camera, ArrowLeft, Trash2, Info, History, Languages, Mic, Film, Translate, User, HeartHandshake, MapPin, School, Hospital, HandHeart, LocateFixed } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebase';

import type { ExtractIngredientsOutput } from '@/ai/types/extract-ingredients-from-receipt';
import type { SuggestRecipesOutput } from '@/ai/types/suggest-recipes-from-ingredients';
import type { DetectSpoiledVegetableOutput } from '@/ai/types/detect-spoiled-vegetable';
import type { GenerateRecipePlanOutput } from '@/ai/types/generate-recipe-plan';
import type { UserProfile } from '@/types/user';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Ingredient = ExtractIngredientsOutput['ingredients'][0];
type Recipe = SuggestRecipesOutput['recipes'][0];
type AppMode = 'suggestions' | 'planner';

const RecipeCard = ({ recipe, onSelect, onToggleFavorite, isFavorited }: { recipe: Recipe, onSelect: (recipe: Recipe) => void, onToggleFavorite: (recipe: Recipe) => void, isFavorited: boolean }) => (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 relative">
        <CardHeader className="p-0 relative">
            <Image src={recipe.imageUrl || "https://placehold.co/600x400.png"} alt={recipe.name} width={600} height={400} className="object-cover w-full h-48" data-ai-hint={`${recipe.name.split(' ').slice(0, 2).join(' ').toLowerCase()}`} />
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/70 hover:bg-white rounded-full h-8 w-8 z-10" onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe);}}>
                <Heart className={`h-5 w-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-slate-600'}`} />
            </Button>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
            <CardTitle className="font-headline text-xl">{recipe.name}</CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0">
            <Button onClick={() => onSelect(recipe)} className="w-full">View Recipe</Button>
        </CardFooter>
    </Card>
);

const donationLocations = [
  { name: 'The Akshaya Patra Foundation', address: 'Vasanthapura, Bengaluru, Karnataka', phone: '+91 80 3014 3400', type: 'charity' },
  { name: 'Goonj - Head Office', address: 'Sarita Vihar, New Delhi, Delhi', phone: '+91 11 4140 1216', type: 'charity' },
  { name: 'Roti Bank by Dabbawala', address: 'Lower Parel, Mumbai, Maharashtra', phone: '+91 98672 21310', type: 'charity' },
  { name: 'Annapoorna Food Bank', address: 'Banjara Hills, Hyderabad, Telangana', phone: '+91 40 2335 5555', type: 'charity' },
];

const LocationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'hospital': return <Hospital className="h-6 w-6" />;
    case 'charity': return <HandHeart className="h-6 w-6" />;
    case 'school': return <School className="h-6 w-6" />;
    default: return <MapPin className="h-6 w-6" />;
  }
};


export default function FreshNCookPage() {
  const [appMode, setAppMode] = useState<AppMode>('suggestions');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [spoiledCount, setSpoiledCount] = useState<Record<string, number>>({});
  const [additionalIngredient, setAdditionalIngredient] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [category, setCategory] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [translatedRecipe, setTranslatedRecipe] = useState<Omit<Recipe, 'imageUrl'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const auth = getAuth(app);

  const [plannerInput, setPlannerInput] = useState('');
  const [recipePlan, setRecipePlan] = useState<GenerateRecipePlanOutput | null>(null);
  
  const [recipeLanguage, setRecipeLanguage] = useState('en');
  const [recipeAudioUrl, setRecipeAudioUrl] = useState<string | null>(null);

  const [isExtracting, startExtractTransition] = useTransition();
  const [isSuggesting, startSuggestTransition] = useTransition();
  const [isCheckingSpoilage, startSpoilageCheckTransition] = useTransition();
  const [isPlanning, startPlanTransition] = useTransition();
  const [isGeneratingAudio, startAudioGenerationTransition] = useTransition();
  const [isTranslating, startTranslationTransition] = useTransition();
  const isLoading = isExtracting || isSuggesting || isPlanning;

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedRecipeNames = useRef(new Set<string>());
  
  const [spoilageCheck, setSpoilageCheck] = useState<{ ingredient: Ingredient | null, result: DetectSpoiledVegetableOutput | null, error: string | null }>({ ingredient: null, result: null, error: null });
  const [spoilageDialogOpen, setSpoilageDialogOpen] = useState(false);
  const [communityHubOpen, setCommunityHubOpen] = useState(false);
  const [communityHubState, setCommunityHubState] = useState<'prompt' | 'loading' | 'results' | 'error'>('prompt');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await handleGetUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [auth]);
  
  const handleOpenSpoilageDialog = (ingredient: Ingredient) => {
    setSpoilageCheck({ ingredient, result: null, error: null });
    setHasCameraPermission(null);
    setSpoilageDialogOpen(true);
  };
  
  // Load favorites from localStorage on initial render
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('recipe-remixer-favorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (e) {
      console.error("Failed to parse favorites from localStorage", e);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('recipe-remixer-favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error("Failed to save favorites to localStorage", e);
    }
  }, [favorites]);

  // Effect to request camera permission and manage stream
  useEffect(() => {
    if (spoilageDialogOpen) {
      let stream: MediaStream;
      const getCameraPermission = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCameraPermission(false);
          return;
        }
        try {
          // First, try to get the back camera
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        } catch (error) {
          console.log("Could not get environment camera, trying default", error);
          try {
            // If that fails, fall back to any available camera
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (e) {
            console.error('Error accessing camera:', e);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings.',
            });
            return;
          }
        }
        setCameraStream(stream);
        setHasCameraPermission(true);
      };
      getCameraPermission();

      return () => {
        // Stop all tracks in the stream when the component unmounts or dialog closes
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        setCameraStream(null);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spoilageDialogOpen, toast]);

  // Effect to attach stream to video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play();
    }
  }, [cameraStream]);


  const toggleFavorite = (recipe: Recipe) => {
    setFavorites(prev => {
      const isFavorited = prev.some(fav => fav.name === recipe.name);
      if (isFavorited) {
        return prev.filter(fav => fav.name !== recipe.name);
      } else {
        return [...prev, recipe];
      }
    });
  };

  const isFavorited = (recipe: Recipe) => {
    return favorites.some(fav => fav.name === recipe.name);
  };


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload an image file.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setIngredients([]);
        setRecipes([]);
        setError(null);
        processedRecipeNames.current.clear();
      };
      reader.readAsDataURL(file);
    }
  };

  const onExtract = () => {
    if (!imagePreview) return;
    setError(null);
    startExtractTransition(async () => {
      try {
        const result = await handleExtractIngredients(imagePreview);
        if (result.ingredients.length === 0) {
            setError("No ingredients found in the image. Please try a clearer image.");
        } else {
            setIngredients(result.ingredients);
        }
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error Processing Image',
          description: e.message || 'An unknown error occurred during ingredient extraction.',
        });
      }
    });
  };

  const onSuggest = (append = false) => {
    setError(null);
    startSuggestTransition(async () => {
      try {
        const additional = additionalIngredient.split(',').map(s => s.trim()).filter(Boolean);
        const favoriteNames = favorites.map(f => f.name);
        const result = await handleSuggestRecipes(ingredients, additional, cuisine, category, favoriteNames);
        if (append) {
          setRecipes(prev => [...prev, ...result.recipes]);
        } else {
          setRecipes(result.recipes);
        }
      } catch (e: any) {
        setError(e.message || 'An unknown error occurred during recipe suggestion.');
      }
    });
  };
  
  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setTranslatedRecipe(null);
    setRecipeLanguage('en');
    setRecipeAudioUrl(null);
  };

  const onGeneratePlan = () => {
    if (!plannerInput) return;
    setError(null);
    setRecipePlan(null);
    startPlanTransition(async () => {
        try {
            const result = await handleGenerateRecipePlan(plannerInput);
            setRecipePlan(result);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred during plan generation.');
        }
    });
  };

  const removeIngredient = (ingredientName: string) => {
    setIngredients(prev => prev.filter((i) => i.name !== ingredientName));
  };
  
  const handleAddIngredient = () => {
    const newIngredients = additionalIngredient.split(',').map(s => s.trim()).filter(Boolean);
    if (newIngredients.length > 0) {
      const existingNames = ingredients.map(i => i.name.toLowerCase());
      const ingredientsToAdd = newIngredients
        .filter(item => !existingNames.includes(item.toLowerCase()))
        .map(name => ({ name, quantity: 1, expirationDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0] }));
      setIngredients(prev => [...prev, ...ingredientsToAdd]);
      setAdditionalIngredient('');
    }
  };

  const startOver = () => {
    setImagePreview(null);
    setIngredients([]);
    setRecipes([]);
    setError(null);
    setAdditionalIngredient('');
    setCuisine('');
    setCategory('');
    setRecipePlan(null);
    setPlannerInput('');
    setSpoiledCount({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    processedRecipeNames.current.clear();
  };

  const handleBack = () => {
    setError(null);
    if (recipePlan) {
      setRecipePlan(null);
      setAppMode('suggestions');
      return;
    }
    if (recipes.length > 0) {
      setRecipes([]);
      return;
    }
    if (ingredients.length > 0) {
      setIngredients([]);
      return;
    }
    if (imagePreview) {
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
  };
  
  const getRecipeImageHint = (name: string) => {
    return name.split(' ').slice(0, 2).join(' ').toLowerCase();
  }

  const handleSpoilageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload an image file.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUri = reader.result as string;
        onSpoilageCheck(imageUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSpoilageCheck = (imageUri: string | null) => {
    if (!spoilageCheck.ingredient || !imageUri) return;

    startSpoilageCheckTransition(async () => {
      try {
        const ingredientToUpdate = spoilageCheck.ingredient!;
        const result = await handleDetectSpoilage(ingredientToUpdate.name, imageUri);
        setSpoilageCheck(prev => ({ ...prev, result, error: null }));

        if (result.isSpoiled) {
          toast({
            title: "Item Spoiled",
            description: `One ${ingredientToUpdate.name} has been moved to the discard pile.`,
            variant: "destructive"
          });
          
          setIngredients(prev => {
            const ingredientIndex = prev.findIndex(ing => ing.name.toLowerCase() === ingredientToUpdate.name.toLowerCase());
            if (ingredientIndex === -1) return prev;
            
            const currentIngredient = prev[ingredientIndex];
            if (currentIngredient.quantity > 1) {
              const updatedIngredients = [...prev];
              updatedIngredients[ingredientIndex] = { ...currentIngredient, quantity: currentIngredient.quantity - 1 };
              return updatedIngredients;
            } else {
              return prev.filter((_, index) => index !== ingredientIndex);
            }
          });

          setSpoiledCount(prev => ({
            ...prev,
            [ingredientToUpdate.name]: (prev[ingredientToUpdate.name] || 0) + 1
          }));
        }
      } catch (e: any) {
        setSpoilageCheck(prev => ({ ...prev, result: null, error: e.message || 'An unknown error occurred.' }));
      }
    });
  };

  const handleCaptureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if(context){
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        onSpoilageCheck(dataUri);
    }
  };
  
  const handleLanguageChange = (lang: string) => {
    setRecipeLanguage(lang);
    setRecipeAudioUrl(null);
    if (!selectedRecipe) return;

    startTranslationTransition(async () => {
      try {
        const { name, ingredients, instructions } = selectedRecipe;
        const result = await handleTranslateRecipe({ name, ingredients, instructions }, lang);
        setTranslatedRecipe(result.translatedRecipe);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Translation Failed',
          description: e.message || 'An unknown error occurred.',
        });
        setTranslatedRecipe(null);
      }
    });
  };

  const onGenerateAudio = () => {
    if (!selectedRecipe) return;
    const recipeText = translatedRecipe ? translatedRecipe.instructions : selectedRecipe.instructions;
    startAudioGenerationTransition(async () => {
        try {
            const result = await handleGenerateRecipeAudio(recipeText, recipeLanguage);
            setRecipeAudioUrl(result.audioUrl);
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Audio Generation Failed',
                description: e.message || 'An unknown error occurred.',
            });
        }
    });
  };
  
  const onFindDonations = () => {
    setCommunityHubState('loading');
    setCommunityHubOpen(true);
    
    if (!navigator.geolocation) {
        setCommunityHubState('error');
        toast({ title: "Geolocation not supported", description: "Your browser does not support geolocation.", variant: "destructive" });
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            // In a real app, you would use position.coords.latitude and position.coords.longitude
            // to make an API call to Google Places or another service.
            // For this prototype, we'll just switch to the results view.
            console.log("User location:", position.coords);
            setCommunityHubState('results');
        },
        (error) => {
            console.error("Geolocation error:", error);
            setCommunityHubState('error');
        }
    );
  };

  const onOpenCommunityHub = () => {
    if (!currentUser) {
      toast({
        title: 'Please Login',
        description: 'You must be logged in to find donation centers.',
        action: <Button onClick={() => router.push('/login')}>Login</Button>
      });
      return;
    }
    // Reset state every time the hub is opened
    setCommunityHubState('prompt');
    setCommunityHubOpen(true);
  };

  useEffect(() => {
    const newRecipes = recipes.filter(recipe => !processedRecipeNames.current.has(recipe.name));
    if (newRecipes.length > 0) {
      newRecipes.forEach((recipe) => {
        if (recipe.imageUrl && recipe.imageUrl.startsWith('https://placehold.co')) {
          processedRecipeNames.current.add(recipe.name);
          handleGenerateImage(recipe.name).then(result => {
            if (result) {
              setRecipes(prev => {
                const newRecipes = [...prev];
                const recipeIndexToUpdate = newRecipes.findIndex(r => r.name === recipe.name);
                if (recipeIndexToUpdate !== -1 && newRecipes[recipeIndexToUpdate].imageUrl?.startsWith('https://placehold.co')) {
                    newRecipes[recipeIndexToUpdate] = { ...newRecipes[recipeIndexToUpdate], imageUrl: result.imageUrl };
                }
                return newRecipes;
              });
            }
          }).catch(error => {
            console.error(`Failed to generate image for ${recipe.name}:`, error);
            toast({
              variant: 'destructive',
              title: 'Image Generation Failed',
              description: `Could not generate an image for "${recipe.name}". Please try again later.`,
            });
          });
        }
      });
    }
  }, [recipes, toast]);
  

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <header className="border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <Leaf className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight font-headline">FreshNCook</h1>
              </div>
              <div className="flex items-center gap-4">
                {(imagePreview || recipes.length > 0 || recipePlan) && (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={handleBack}>
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button variant="ghost" size="sm" onClick={startOver}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Start Over
                      </Button>
                    </div>
                  )}
                  <Button onClick={() => router.push(currentUser ? '/profile' : '/login')} variant="outline">
                    <User className="mr-2 h-4 w-4" />
                    {currentUser ? 'Profile' : 'Login'}
                  </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl mx-auto">
            {imagePreview && ingredients.length === 0 && !isExtracting && error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Could Not Find Ingredients</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!imagePreview && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <CardHeader>
                          <CardTitle className="font-headline text-3xl flex items-center justify-center gap-3">
                              <ChefHat className="h-8 w-8 text-primary" />
                              <span>Upload Your Pantry Items</span>
                          </CardTitle>
                           <p className="text-center text-muted-foreground pt-2">Upload a photo of your pantry or a receipt to get started.</p>
                      </CardHeader>
                      <CardContent className="p-8 pt-2">
                          <Label htmlFor="receipt-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-muted transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP</p>
                              </div>
                              <Input id="receipt-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" ref={fileInputRef} />
                          </Label>
                      </CardContent>
                  </Card>
                   <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl flex items-center justify-center gap-3">
                            <HeartHandshake className="h-8 w-8 text-primary" />
                            Community Hub
                        </CardTitle>
                         <p className="text-center text-muted-foreground pt-2">Share your surplus food with those in need.</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-2 flex flex-col items-center justify-center text-center space-y-4 h-[21.5rem]">
                        <p className="text-muted-foreground">Have extra food? Find a local charity, school, or hospital to donate it to.</p>
                        <Button className="w-full" onClick={onOpenCommunityHub}>
                            Find Nearby Donation Centers
                        </Button>
                    </CardContent>
                </Card>
              </div>
            )}

            {imagePreview && ingredients.length === 0 && (
              <Card className="overflow-hidden shadow-lg">
                  <CardHeader>
                      <CardTitle className="font-headline text-2xl">Your Pantry Items</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-6">
                      <Image src={imagePreview} alt="Pantry items preview" width={400} height={600} className="rounded-lg object-contain max-h-[50vh] w-auto border" />
                      <Button onClick={onExtract} disabled={isExtracting} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full max-w-sm text-base py-6">
                          {isExtracting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                          {isExtracting ? 'Analyzing Image...' : 'Extract Ingredients'}
                      </Button>
                  </CardContent>
              </Card>
            )}

            {ingredients.length > 0 && recipes.length === 0 && !recipePlan && (
              <div className="grid grid-cols-1 gap-6">
                <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="font-headline text-2xl">Your Ingredients</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="app-mode" className="text-sm font-medium">Suggestions</Label>
                            <Switch id="app-mode" checked={appMode === 'planner'} onCheckedChange={(checked) => setAppMode(checked ? 'planner' : 'suggestions')} aria-label="Switch to recipe planner mode" />
                            <Label htmlFor="app-mode" className="text-sm font-medium">Planner</Label>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {appMode === 'suggestions' ? (
                            <>
                                <div className="p-4 border rounded-lg bg-secondary min-h-[4rem] space-y-2">
                                    {ingredients.map((ingredient, index) => (
                                      <div key={index} className="inline-block mr-2">
                                        <Badge variant="secondary" className="text-base py-1 pl-3 pr-1 text-secondary-foreground bg-white">
                                          <span className="flex items-center gap-2">
                                            {ingredient.name}
                                            {ingredient.quantity > 1 && <span className="text-xs font-bold">x{ingredient.quantity}</span>}
                                             {ingredient.expirationDate && (
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                                                            <Clock className="h-3 w-3"/>
                                                            {format(parseISO(ingredient.expirationDate), 'MMM dd')}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>Est. Expiration: {format(parseISO(ingredient.expirationDate), 'MMMM dd, yyyy')}</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                              )}
                                          </span>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <button onClick={() => handleOpenSpoilageDialog(ingredient)} className="ml-2 rounded-full hover:bg-black/20 p-0.5">
                                                      <Microscope className="h-3 w-3" />
                                                  </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                  <p>Check Freshness</p>
                                              </TooltipContent>
                                          </Tooltip>
                                          <button onClick={() => removeIngredient(ingredient.name)} className="ml-1 rounded-full hover:bg-black/20 p-0.5">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      </div>
                                    ))}
                                </div>

                                {Object.keys(spoiledCount).length > 0 && (
                                    <Card>
                                      <CardHeader className="p-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Trash2 className="h-5 w-5 text-destructive" />
                                            Discard Pile
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="p-3 pt-0">
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(spoiledCount).map(([name, count]) => (
                                                <Badge key={name} variant="destructive" className="text-base py-1">
                                                    {name} {count > 1 && `x${count}`}
                                                </Badge>
                                            ))}
                                        </div>
                                      </CardContent>
                                    </Card>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="text"
                                            placeholder="Add more items (e.g., olive oil, salt)"
                                            value={additionalIngredient}
                                            onChange={(e) => setAdditionalIngredient(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                                            disabled={isLoading}
                                        />
                                        <Button onClick={handleAddIngredient} disabled={isLoading || !additionalIngredient} variant="outline" size="icon">
                                            <Plus className="h-4 w-4" />
                                            <span className="sr-only">Add Ingredient</span>
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <Input
                                          type="text"
                                          placeholder="Optional: Specify a cuisine (e.g., Italian)"
                                          value={cuisine}
                                          onChange={(e) => setCuisine(e.target.value)}
                                          disabled={isLoading}
                                      />
                                      <Select onValueChange={setCategory} value={category} disabled={isLoading}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Optional: Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Breakfast">Breakfast</SelectItem>
                                          <SelectItem value="Lunch">Lunch</SelectItem>
                                          <SelectItem value="Dinner">Dinner</SelectItem>
                                          <SelectItem value="Snack">Snack</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Button onClick={() => onSuggest()} disabled={isSuggesting} className="w-full text-base py-6">
                                      {isSuggesting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ChefHat className="mr-2 h-5 w-5" />}
                                      {isSuggesting ? 'Generating Recipes...' : 'Suggest Recipes'}
                                  </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4 text-center">
                                <Bot className="h-12 w-12 mx-auto text-primary" />
                                <h3 className="text-xl font-headline">Recipe Planner AI</h3>
                                <p className="text-muted-foreground">What do you want to cook today? Tell me the name of a dish, and I'll generate a full cooking plan for you.</p>
                                 <div className="flex items-center gap-2">
                                    <Input
                                        type="text"
                                        placeholder="e.g., Classic Spaghetti Carbonara"
                                        value={plannerInput}
                                        onChange={(e) => setPlannerInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && onGeneratePlan()}
                                        disabled={isPlanning}
                                    />
                                    <Button onClick={onGeneratePlan} disabled={isPlanning || !plannerInput}>
                                        {isPlanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate Plan
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
              </div>
            )}
            
            {recipePlan && (
              <Card className="shadow-lg">
                  <CardHeader>
                      <CardTitle className="font-headline text-3xl flex items-center gap-3">
                          <ClipboardCheck className="h-8 w-8 text-primary" />
                          {recipePlan.recipeName}
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <p className="text-lg text-muted-foreground italic">{recipePlan.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-1">
                              <h3 className="font-bold text-xl mb-3 border-b pb-2">Ingredients</h3>
                              <ul className="list-disc list-inside space-y-1">
                                  {recipePlan.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                              </ul>
                          </div>
                          <div className="md:col-span-2">
                               <h3 className="font-bold text-xl mb-3 border-b pb-2">Cooking Steps</h3>
                               <div className="space-y-4">
                                  {recipePlan.steps.map((step, i) => (
                                      <div key={i}>
                                          <h4 className="font-bold text-lg">{i + 1}. {step.stepTitle}</h4>
                                          <p className="pl-4 text-muted-foreground">{step.instructions}</p>
                                      </div>
                                  ))}
                               </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>
            )}

            {(recipes.length > 0 || favorites.length > 0) && appMode === 'suggestions' && !recipePlan && (
              <Tabs defaultValue="suggestions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                  <TabsTrigger value="favorites">My Favorites ({favorites.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="suggestions">
                    <div className="w-full">
                        <h2 className="text-3xl font-bold text-center mb-8 font-headline">Enjoy your meal!</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                          {recipes.map((recipe, index) => (
                            <RecipeCard 
                                key={index} 
                                recipe={recipe} 
                                onSelect={handleSelectRecipe}
                                onToggleFavorite={toggleFavorite}
                                isFavorited={isFavorited(recipe)}
                            />
                          ))}
                        </div>
                        <div className="mt-8 text-center">
                            <Button onClick={() => onSuggest(true)} disabled={isSuggesting} variant="outline" className="text-base py-6">
                                {isSuggesting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                                {isSuggesting ? 'Getting More...' : 'Suggest More Recipes'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="favorites">
                  <div className="w-full">
                      <h2 className="text-3xl font-bold text-center mb-8 font-headline">My Favorite Recipes</h2>
                      {favorites.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                          {favorites.map((recipe, index) => (
                            <RecipeCard 
                                key={index} 
                                recipe={recipe} 
                                onSelect={handleSelectRecipe}
                                onToggleFavorite={toggleFavorite}
                                isFavorited={isFavorited(recipe)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground mt-8">You haven't favorited any recipes yet. Click the heart on a recipe to save it!</p>
                      )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
        
        <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
          <DialogContent className="max-w-2xl">
            {selectedRecipe && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-headline text-3xl mb-4">{translatedRecipe ? translatedRecipe.name : selectedRecipe.name}</DialogTitle>
                </DialogHeader>
                <div>
                  <Image src={selectedRecipe.imageUrl || "https://placehold.co/600x400.png"} alt={selectedRecipe.name} width={600} height={400} className="rounded-lg object-cover w-full h-64 mb-6" data-ai-hint={getRecipeImageHint(selectedRecipe.name)}/>
                  
                   <div className="my-4 p-4 bg-secondary rounded-lg">
                      <h3 className="font-bold text-lg mb-4">Media Hub</h3>
                      <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 space-y-2">
                             <div className="flex items-center gap-2">
                                  <Select onValueChange={handleLanguageChange} value={recipeLanguage}>
                                      <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select Language" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="en">English</SelectItem>
                                          <SelectItem value="es">Spanish</SelectItem>
                                          <SelectItem value="fr">French</SelectItem>
                                          <SelectItem value="de">German</SelectItem>
                                          <SelectItem value="it">Italian</SelectItem>
                                          <SelectItem value="hi">Hindi</SelectItem>
                                          <SelectItem value="bn">Bengali</SelectItem>
                                          <SelectItem value="ta">Tamil</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <Button onClick={onGenerateAudio} disabled={isGeneratingAudio || isTranslating}>
                                      {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isGeneratingAudio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                                      Listen
                                  </Button>
                             </div>
                             {recipeAudioUrl && (
                                  <audio controls src={recipeAudioUrl} className="w-full">
                                      Your browser does not support the audio element.
                                  </audio>
                             )}
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-foreground">
                    <div>
                      <h3 className="font-bold text-lg mb-2 border-b pb-2">Ingredients</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {(translatedRecipe ? translatedRecipe.ingredients : selectedRecipe.ingredients).map((ing, i) => <li key={i}>{ing}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2 border-b pb-2">Instructions</h3>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{translatedRecipe ? translatedRecipe.instructions : selectedRecipe.instructions}</div>
                    </div>
                  </div>

                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        
        <Dialog open={spoilageDialogOpen} onOpenChange={setSpoilageDialogOpen}>
          <DialogContent className="max-w-md">
              <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Check Freshness: {spoilageCheck.ingredient?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  {hasCameraPermission === null && (
                      <div className="flex flex-col items-center justify-center h-48">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                          <p className="mt-4 text-muted-foreground">Requesting camera access...</p>
                      </div>
                  )}

                  {hasCameraPermission === true && (
                      <div className="flex flex-col items-center gap-4">
                          <div className="w-full aspect-video bg-black rounded-md overflow-hidden relative">
                             <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <div className="w-2/3 h-2/3 border-2 border-dashed border-white/50 rounded-lg"/>
                             </div>
                          </div>
                          <Button onClick={handleCaptureAndScan} disabled={isCheckingSpoilage} className="w-full">
                              {isCheckingSpoilage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                              {isCheckingSpoilage ? 'Analyzing...' : 'Scan Vegetable'}
                          </Button>
                      </div>
                  )}
                  
                  {hasCameraPermission === false && (
                      <Alert>
                          <Video className="h-4 w-4" />
                          <AlertTitle>Camera Not Available</AlertTitle>
                          <AlertDescription>
                              Camera access was denied or is not available. You can upload a photo instead.
                              <Label htmlFor="spoilage-upload" className="mt-4 inline-block w-full text-center p-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90">
                                  Upload Photo
                                  <Input id="spoilage-upload" type="file" className="hidden" onChange={handleSpoilageFileChange} accept="image/png, image/jpeg, image/webp" />
                              </Label>
                          </AlertDescription>
                      </Alert>
                  )}
                  
                  {isCheckingSpoilage && !spoilageCheck.result && (
                       <div className="flex items-center justify-center h-24">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                       </div>
                  )}

                  {spoilageCheck.error && (
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Analysis Failed</AlertTitle>
                          <AlertDescription>{spoilageCheck.error}</AlertDescription>
                      </Alert>
                  )}
                  {spoilageCheck.result && (
                    <>
                      {spoilageCheck.result.isVegetable === false ? (
                         <Card className="border-amber-500 bg-amber-500/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-700">
                                    Vegetable Not Detected
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>{spoilageCheck.result.reason}</p>
                            </CardContent>
                         </Card>
                      ) : (
                        <Card className={spoilageCheck.result.isSpoiled ? "border-destructive bg-destructive/10" : "border-green-500 bg-green-500/10"}>
                            <CardHeader>
                                <CardTitle className={`flex items-center gap-2 ${spoilageCheck.result.isSpoiled ? "text-destructive" : "text-green-700"}`}>
                                    {spoilageCheck.result.isSpoiled ? 'Likely Spoiled' : 'Looks Fresh'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p><span className="font-semibold">Reason:</span> {spoilageCheck.result.reason}</p>
                                {spoilageCheck.result.confidence !== null && spoilageCheck.result.confidence !== undefined && (
                                  <p><span className="font-semibold">Confidence:</span> {Math.round(spoilageCheck.result.confidence * 100)}%</p>
                                )}
                            </CardContent>
                        </Card>
                      )}
                    </>
                  )}
              </div>
          </DialogContent>
        </Dialog>

        <Dialog open={communityHubOpen} onOpenChange={setCommunityHubOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl flex items-center gap-3">
                <MapPin className="h-6 w-6 text-primary" />
                Nearby Donation Centers
              </DialogTitle>
              <DialogDescription>
                Find local organizations where you can donate your surplus food.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {communityHubState === 'prompt' && (
                  <div className="text-center space-y-4">
                      <p className="text-muted-foreground">Please allow us to access your location to find nearby donation centers.</p>
                      <Button onClick={onFindDonations}>
                          <LocateFixed className="mr-2 h-4 w-4"/>
                          Use My Current Location
                      </Button>
                  </div>
              )}
              {communityHubState === 'loading' && (
                  <div className="flex flex-col items-center justify-center h-24 gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Finding your location...</p>
                  </div>
              )}
              {communityHubState === 'error' && (
                  <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Location Access Denied</AlertTitle>
                      <AlertDescription>
                          You have denied access to your location. We can't find nearby centers without it. Please enable location permissions in your browser settings and try again.
                      </AlertDescription>
                  </Alert>
              )}
              {communityHubState === 'results' && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {donationLocations.map((location, index) => (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-start gap-4 p-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-full">
                            <LocationIcon type={location.type} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{location.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                           <p className="text-sm text-primary font-medium mt-1">{location.phone}</p>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}