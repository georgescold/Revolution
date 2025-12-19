'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteImage, deleteImages } from '@/server/actions/image-actions';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { cn } from '@/lib/utils';

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
    const [isPending, startTransition] = useTransition();

    // Bulk Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === images.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(images.map(img => img.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Supprimer ${selectedIds.size} images ?`)) return;

        startTransition(async () => {
            const result = await deleteImages(Array.from(selectedIds));
            if (result.success) {
                toast.success(`${selectedIds.size} images supprimées`);
                setSelectedIds(new Set());
                setIsSelectionMode(false);
            } else {
                toast.error('Erreur lors de la suppression de groupe');
            }
        });
    };

    const handleDelete = async (e: React.MouseEvent, img: ClientImage) => {
        e.stopPropagation();
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return;

        startTransition(async () => {
            const result = await deleteImage(img.id, img.storageUrl);
            if (result.success) {
                toast.success('Image supprimée');
                if (selectedImage?.id === img.id) setSelectedImage(null);
            } else {
                toast.error('Erreur lors de la suppression');
            }
        });
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4">
                <Button
                    variant={isSelectionMode ? "secondary" : "outline"}
                    onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedIds(new Set());
                    }}
                    className="gap-2"
                >
                    {isSelectionMode ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isSelectionMode ? 'Annuler' : 'Gérer / Supprimer'}
                </Button>

                {isSelectionMode && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                        <Button variant="outline" onClick={handleSelectAll}>
                            {selectedIds.size === images.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={selectedIds.size === 0 || isPending}
                            onClick={handleBulkDelete}
                        >
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Supprimer ({selectedIds.size})
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                {images.map((img) => {
                    const isSelected = selectedIds.has(img.id);

                    return (
                        <Card
                            key={img.id}
                            className={cn(
                                "group relative overflow-hidden aspect-square cursor-pointer border-0 transition-all duration-200",
                                isSelectionMode && isSelected && "ring-4 ring-primary ring-offset-2",
                                isSelectionMode && !isSelected && "opacity-60 grayscale"
                            )}
                            onClick={() => {
                                if (isSelectionMode) {
                                    toggleSelection(img.id);
                                } else {
                                    setSelectedImage(img);
                                }
                            }}
                        >
                            <ImageWithFallback
                                src={img.storageUrl}
                                alt={img.descriptionLong.slice(0, 50)}
                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                            />

                            {/* Selection Checkbox Overlay */}
                            {isSelectionMode && (
                                <div className="absolute top-2 right-2 z-10">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors bg-black/50",
                                        isSelected ? "bg-primary border-primary" : "border-white"
                                    )}>
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                </div>
                            )}

                            {/* Normal Hover Overlay (Hidden in Selection Mode) */}
                            {!isSelectionMode && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            onClick={(e) => handleDelete(e, img)}
                                            disabled={isPending}
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-white font-mono mb-1">{img.humanId}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {getKeywordsArray(img.keywords).slice(0, 2).map((k: string) => (
                                            <span key={k} className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{k}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-2xl bg-card border-2 border-border">
                    <DialogHeader>
                        <DialogTitle>{selectedImage?.humanId}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center">
                            {selectedImage && (
                                <ImageWithFallback
                                    src={selectedImage.storageUrl}
                                    className="object-contain w-full h-full"
                                    alt="Preview"
                                />
                            )}
                        </div>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-4 pr-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-1 text-primary">Description</h4>
                                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                                        {selectedImage?.descriptionLong}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm mb-1 text-primary">Mots-clés</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {getKeywordsArray(selectedImage?.keywords).map((k: string) => (
                                            <Badge key={k} variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/80">{k}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-primary">Ambiance</h4>
                                        <p className="text-sm font-medium">{selectedImage?.mood}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1 text-primary">Style</h4>
                                        <p className="text-sm font-medium">{selectedImage?.style}</p>
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
