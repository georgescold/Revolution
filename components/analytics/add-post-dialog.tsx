'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addPost } from '@/server/actions/analytics-actions';
import { getUserImages } from '@/server/actions/image-actions';
import { toast } from 'sonner';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { SlideEditor } from './slide-editor';
import { SlideData, UserImage } from '@/types/post';

export function AddPostDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [isPending, startTransition] = useTransition();
    const [images, setImages] = useState<UserImage[]>([]);

    // Step 1 data
    const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('tiktok');
    const [slides, setSlides] = useState<SlideData[]>([
        { imageId: '', imageHumanId: '', description: '', text: '' }
    ]);

    // Step 2 data
    const [views, setViews] = useState('0');
    const [likes, setLikes] = useState('0');
    const [saves, setSaves] = useState('0');
    const [comments, setComments] = useState('0');

    // Load images when dialog opens
    useEffect(() => {
        if (open) {
            startTransition(async () => {
                const result = await getUserImages();
                if (result.success && result.images) {
                    setImages(result.images);
                } else {
                    toast.error(result.error || 'Impossible de charger les images');
                }
            });
        }
    }, [open]);

    const handleSlideChange = (index: number, slide: SlideData) => {
        const newSlides = [...slides];
        newSlides[index] = slide;
        setSlides(newSlides);
    };

    const handleAddSlide = () => {
        setSlides([...slides, { imageId: '', imageHumanId: '', description: '', text: '' }]);
    };

    const handleRemoveSlide = (index: number) => {
        if (slides.length > 1) {
            setSlides(slides.filter((_, i) => i !== index));
        }
    };

    const canProceedToStep2 = () => {
        return slides.every(slide => slide.imageId && slide.text.trim());
    };

    const handleNext = () => {
        if (!canProceedToStep2()) {
            toast.error('Veuillez remplir toutes les slides avant de continuer');
            return;
        }
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleSubmit = () => {
        startTransition(async () => {
            const data = {
                platform,
                slides,
                views: Number(views),
                likes: Number(likes),
                saves: Number(saves),
                comments: Number(comments),
            };

            const result = await addPost(data);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Post ajouté !");
                setOpen(false);
                // Reset form
                setStep(1);
                setPlatform('tiktok');
                setSlides([{ imageId: '', imageHumanId: '', description: '', text: '' }]);
                setViews('0');
                setLikes('0');
                setSaves('0');
                setComments('0');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter un post
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] bg-card max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Ajouter un post existant</DialogTitle>
                    <DialogDescription>
                        Étape {step}/2 - {step === 1 ? 'Configuration des slides' : 'Métriques du post'}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4 py-4">
                        {/* Platform Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="platform">Plateforme</Label>
                            <Select value={platform} onValueChange={(v) => setPlatform(v as 'tiktok' | 'instagram')}>
                                <SelectTrigger id="platform">
                                    <SelectValue placeholder="Choisir" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tiktok">TikTok</SelectItem>
                                    <SelectItem value="instagram">Instagram</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Title Field */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Titre du post</Label>
                            <Input
                                id="title"
                                placeholder="Ex: Mon meilleur carrousel sur..."
                                value={slides[0]?.text || ''}
                                onChange={(e) => {
                                    const newSlides = [...slides];
                                    if (newSlides[0]) {
                                        newSlides[0].text = e.target.value;
                                        setSlides(newSlides);
                                    }
                                }}
                                className="font-medium"
                            />
                        </div>

                        {/* Slides */}
                        <div className="space-y-3">
                            <Label>Slides du carrousel</Label>
                            {slides.map((slide, index) => (
                                <SlideEditor
                                    key={index}
                                    slide={slide}
                                    index={index}
                                    images={images}
                                    onChange={handleSlideChange}
                                    onRemove={handleRemoveSlide}
                                    canRemove={slides.length > 1}
                                />
                            ))}

                            {/* Add Slide Button */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-dashed border-2 border-primary/50 hover:border-primary hover:bg-primary/5"
                                onClick={handleAddSlide}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Ajouter une slide
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="views">Vues</Label>
                                <Input
                                    id="views"
                                    type="number"
                                    value={views}
                                    onChange={(e) => setViews(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="likes">Likes</Label>
                                <Input
                                    id="likes"
                                    type="number"
                                    value={likes}
                                    onChange={(e) => setLikes(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="saves">Signés / Enregistrements</Label>
                                <Input
                                    id="saves"
                                    type="number"
                                    value={saves}
                                    onChange={(e) => setSaves(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="comments">Commentaires</Label>
                                <Input
                                    id="comments"
                                    type="number"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                    {step === 2 && (
                        <Button type="button" variant="outline" onClick={handleBack}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
                        </Button>
                    )}
                    {step === 1 && (
                        <Button type="button" onClick={handleNext} disabled={!canProceedToStep2()}>
                            Suivant <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                    {step === 2 && (
                        <Button type="button" onClick={handleSubmit} disabled={isPending} className="bg-primary hover:bg-primary/90">
                            {isPending ? 'Ajout...' : 'Sauvegarder'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
