
export interface Location {
    latitude: number;
    longitude: number;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    createdAt: string;
    location: Location | null;
}
