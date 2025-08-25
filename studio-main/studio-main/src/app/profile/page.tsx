
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAuth, onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { handleGetUserProfile } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Loader2, User as UserIcon, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = getAuth(app);
    
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const profile = await handleGetUserProfile(user.uid);
                    setUserProfile(profile);
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Could not fetch your profile data.'
                    });
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [auth, router, toast]);
    
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
            router.push('/login');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Sign Out Failed',
                description: error.message,
            });
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center items-center">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-8 w-48 mt-4" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!userProfile) {
        return (
             <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
                <Card className="w-full max-w-md p-8 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle className="mt-4">Profile Not Found</CardTitle>
                    <CardDescription className="mt-2">
                        We couldn't load your profile. Please try logging out and back in.
                    </CardDescription>
                     <Button onClick={handleSignOut} variant="destructive" className="w-full mt-6">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </Card>
             </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center items-center">
                    {userProfile.photoURL ? (
                        <Image
                            src={userProfile.photoURL}
                            alt={userProfile.displayName}
                            width={96}
                            height={96}
                            className="mx-auto rounded-full border-4 border-white shadow-lg"
                        />
                    ) : (
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                            <UserIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}
                    <CardTitle className="mt-4 text-2xl font-bold">{userProfile.displayName}</CardTitle>
                    <CardDescription>{userProfile.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                        Back to App
                    </Button>
                    <Button onClick={handleSignOut} variant="destructive" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
