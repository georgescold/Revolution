export type SlideData = {
    imageId: string; // Reference to Image.id
    imageHumanId: string; // IMG-00001 for display
    description: string; // From Image.descriptionLong
    text: string; // User-entered text for this slide
};

export type PostFormData = {
    platform: 'tiktok' | 'instagram';
    slides: SlideData[];
    metrics: {
        views: number;
        likes: number;
        saves: number;
        comments: number;
    };
};

export type UserImage = {
    id: string;
    humanId: string;
    descriptionLong: string;
    storageUrl: string;
};
