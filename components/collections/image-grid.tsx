'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to safely get keywords as array (handles both string and array)
function getKeywordsArray(keywords: string | string[] | null | undefined): string[] {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    try {
        return JSON.parse(keywords);
    } catch {
        return [];
    }
}

// Using a simplified type for the client data - keywords/colors can be string or array
type ClientImage = {
    id: string;
    humanId: string;
    storageUrl: string;
    descriptionLong: string;
    keywords: string | string[];
    colors?: string | string[] | null;
    mood?: string | null;
    style?: string | null;
};

export function ImageGrid({ images }: { images: ClientImage[] }) {
    const [selectedImage, setSelectedImage] = useState<ClientImage | null>(null);

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
                {images.map((img) => (
                    <Card
                        key={img.id}
                        className="group relative overflow-hidden aspect-square cursor-pointer border-0"
                        onClick={() => setSelectedImage(img)}
                    >
                        <img
                            src={img.storageUrl}
                            alt={img.descriptionLong.slice(0, 50)}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                            <p className="text-xs text-white font-mono mb-1">{img.humanId}</p>
                            <div className="flex flex-wrap gap-1">
                                {getKeywordsArray(img.keywords).slice(0, 2).map((k: string) => (
                                    <span key={k} className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{k}</span>
                                ))}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-2xl bg-card">
                    <DialogHeader>
                        <DialogTitle>{selectedImage?.humanId}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="aspect-square rounded-md overflow-hidden bg-black/20">
                            {selectedImage && <img src={selectedImage.storageUrl} className="object-contain w-full h-full" alt="Preview" />}
                        </div>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-4 pr-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-1 text-primary">Description</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {selectedImage?.descriptionLong}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm mb-1 text-primary">Keywords</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {getKeywordsArray(selectedImage?.keywords).map((k: string) => (
                                            <Badge key={k} variant="secondary">{k}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-primary">Mood</h4>
                                        <p className="text-sm">{selectedImage?.mood}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-primary">Style</h4>
                                        <p className="text-sm">{selectedImage?.style}</p>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
