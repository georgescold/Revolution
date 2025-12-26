'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateHooks, generateCarousel, saveCarousel, getDrafts, updatePostContent, saveHookAsIdea, getSavedIdeas, deletePost, rejectHook, generateReplacementHook, HookProposal, Slide } from '@/server/actions/creation-actions';
import { retryFailedAnalyses, getUserImages } from '@/server/actions/image-actions';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, RefreshCw, FileText, Clock, ArrowRight, Bookmark, Lightbulb, User, Trash, Image as ImageIcon, X, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';


interface CreationViewProps {
    initialPost?: {
        id: string;
        hookText: string;
        slides: string | null; // JSON string
        status: string;
    };
}

export function CreationView({ initialPost }: CreationViewProps) {
    const [step, setStep] = useState<'hooks' | 'config' | 'preview'>('hooks');
    const [hooks, setHooks] = useState<HookProposal[]>([]);
    const [selectedHook, setSelectedHook] = useState<HookProposal | null>(null);

    const [slides, setSlides] = useState<Slide[]>([]);
    const [description, setDescription] = useState("");
    const [drafts, setDrafts] = useState<any[]>([]);
    const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Image Picker State
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [pickingSlideIndex, setPickingSlideIndex] = useState<number | null>(null);
    const [userImages, setUserImages] = useState<any[]>([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);

    useEffect(() => {
        if (initialPost) {
            try {
                // ... (rest of initialPost logic)
                const parsedSlides = JSON.parse(initialPost.slides ?? '[]');
                setSlides(parsedSlides);
                // ... (rest)
                setDescription((initialPost as any).description || "");

                setSelectedHook({
                    id: 'edit',
                    angle: 'Edit',
                    hook: initialPost.hookText,
                    reason: 'Editing existing post'
                });
                setEditingId(initialPost.id);
                setStep('preview');
            } catch (e) {
                toast.error("Erreur au chargement du post");
            }
        } else if (step === 'hooks') {
            loadDrafts();
        }
    }, [initialPost, step]);

    const loadDrafts = async () => {
        const [draftsRes, ideasRes] = await Promise.all([getDrafts(), getSavedIdeas()]);
        if (draftsRes.success && draftsRes.drafts) setDrafts(draftsRes.drafts);
        if (ideasRes.success && ideasRes.ideas) setSavedIdeas(ideasRes.ideas);
    };

    const handleOpenImagePicker = async (index: number) => {
        setPickingSlideIndex(index);
        setIsImagePickerOpen(true);
        if (userImages.length === 0) {
            setIsLoadingImages(true);
            const res = await getUserImages();
            if (res.success && res.images) {
                setUserImages(res.images);
            } else {
                toast.error("Impossible de charger vos images");
            }
            setIsLoadingImages(false);
        }
    };

    const handleSelectImage = (image: any) => {
        if (pickingSlideIndex !== null) {
            const newSlides = [...slides];
            // Update the specific slide
            // Note: image.storageUrl might be relative or absolute depending on how it's stored
            // getUserImages returns `storageUrl` which is typically `/uploads/...` or `/api/uploads/...`
            newSlides[pickingSlideIndex] = {
                ...newSlides[pickingSlideIndex],
                image_id: image.id,
                image_url: image.storageUrl // This should be displayable
            };
            setSlides(newSlides);
            setIsImagePickerOpen(false);
            setPickingSlideIndex(null);
        }
    };

    const handleGenerateHooks = () => {
        startTransition(async () => {
            const result = await generateHooks();
            if (result.error) toast.error(result.error);
            else if (result.hooks) {
                setHooks(result.hooks);
                setEditingId(null); // Clear editing ID when starting new
            }
        });
    };

    const handleRejectHook = (index: number, hook: HookProposal) => {
        setReplacingIndex(index);
        startTransition(async () => {
            // 1. Reject
            await rejectHook(hook);

            // 2. Replace
            const res = await generateReplacementHook(hook);
            if (res.hook) {
                const newHooks = [...hooks];
                newHooks[index] = res.hook;
                setHooks(newHooks);
                toast.success("Nouvel angle généré !");
            } else {
                toast.error("Impossible de remplacer ce hook");
            }
            setReplacingIndex(null);
        });
    };

    const handleAddSlide = () => {
        const newSlide: Slide = {
            slide_number: slides.length + 1,
            text: "Nouveau texte",
            intention: "Nouvelle slide manuelle"
        };
        setSlides([...slides, newSlide]);
    };

    const handleDeleteSlide = (index: number) => {
        const newSlides = slides.filter((_, i) => i !== index);
        // Re-index slides
        const reindexed = newSlides.map((s, i) => ({ ...s, slide_number: i + 1 }));
        setSlides(reindexed);
    };

    const handleTextChange = (index: number, text: string) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], text };
        setSlides(newSlides);
    };

    const handleGenerateCarousel = () => {
        if (!selectedHook) return;
        startTransition(async () => {
            const result = await generateCarousel(selectedHook.hook);
            if (result.error) toast.error(result.error);
            else if (result.slides) {
                setSlides(result.slides);
                setDescription(result.description || ""); // [NEW] Set description
                setStep('preview');
            }
        });
    };

    const handleDownloadImages = async () => {
        if (!slides.length) return;

        const zip = new JSZip();
        let addedCount = 0;

        const loadingToast = toast.loading("Préparation du téléchargement...");

        try {
            const promises = slides.map(async (slide) => {
                if (slide.image_url) {
                    try {
                        const response = await fetch(slide.image_url);
                        const blob = await response.blob();
                        // Detect extension from blob type or default to jpg
                        const ext = blob.type.split('/')[1] || 'jpg';
                        zip.file(`${slide.slide_number}.${ext}`, blob);
                        addedCount++;
                    } catch (err) {
                        console.error(`Failed to download image for slide ${slide.slide_number}`, err);
                    }
                }
            });

            await Promise.all(promises);

            if (addedCount === 0) {
                toast.error("Aucune image valide trouvée pour le téléchargement.");
                toast.dismiss(loadingToast);
                return;
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `carousel-${selectedHook?.angle || 'export'}.zip`);
            toast.success("Téléchargement démarré !");
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la création du zip.");
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleSave = (asDraft = false) => {
        startTransition(async () => {
            if (!selectedHook) return;

            if (editingId) {
                // Update existing post (draft or published)
                const res = await updatePostContent(editingId, slides, description, asDraft ? 'draft' : 'created');
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success(asDraft ? "Brouillon mis à jour !" : "Post mis à jour !");
                // Always return to home unless instructed otherwise
                setStep('hooks');
                setHooks([]);
                setDescription("");
                setEditingId(null);
                loadDrafts(); // Refresh lists
            } else {
                // Create new
                const res = await saveCarousel(selectedHook.hook, slides, description, asDraft ? 'draft' : 'created');
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success(asDraft ? "Brouillon sauvegardé !" : "Carrousel sauvegardé !");
                setStep('hooks');
                setHooks([]);
                setDescription("");
                loadDrafts(); // Refresh lists
            }
        });
    };

    const handleSaveIdea = (hook: HookProposal) => {
        startTransition(async () => {
            const res = await saveHookAsIdea(hook);
            if (res.error) toast.error(res.error);
            else {
                toast.success("Idée sauvegardée !");
                loadDrafts(); // Refresh lists
            }
        });
    };

    const resumeDraft = (draft: any) => {
        try {
            const parsedSlides = JSON.parse(draft.slides as string);
            setSlides(parsedSlides);
            setDescription(draft.description || ""); // [NEW] Load description
            setSelectedHook({ id: 'draft', angle: 'Draft', hook: draft.hookText, reason: 'Resume' });
            setEditingId(draft.id); // Track ID
            setStep('preview');
        } catch (e) {
            toast.error("Impossible d'ouvrir ce brouillon");
        }
    };

    const handleDeleteDraft = async (id: string) => {
        const res = await deletePost(id);
        if (res.success) {
            toast.success("Brouillon supprimé");
            loadDrafts();
        } else {
            toast.error("Erreur lors de la suppression");
        }
    };

    // Step 1: Hooks
    if (step === 'hooks') {
        return (
            <div className="space-y-10 max-w-4xl mx-auto py-8">
                {/* Hero Section */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-3xl blur-xl" />
                    <Card className="relative bg-card/60 backdrop-blur-xl border-border/30 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                        <CardHeader className="text-center space-y-4 pt-12 pb-6 relative z-10">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                                    Studio de Création
                                </CardTitle>
                                <CardDescription className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">
                                    Crée des contenus viraux qui captivent ton audience
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="pb-12 relative z-10">
                            <div className="flex flex-col items-center gap-6">
                                <Button
                                    size="lg"
                                    onClick={handleGenerateHooks}
                                    disabled={isPending}
                                    className="gap-3 text-lg h-16 px-10 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-6 h-6" />
                                    )}
                                    Créer un post
                                </Button>
                                <p className="text-sm text-muted-foreground/70">
                                    L'IA va analyser les tendances et te proposer des angles viraux
                                </p>
                            </div>
                            <div className="flex justify-center mt-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        toast.info("Relance de l'analyse des images...");
                                        const res = await retryFailedAnalyses();
                                        if (res.success) {
                                            toast.success(`${res.count} images analysées avec succès !`);
                                        } else {
                                            toast.error(res.error || "Erreur inconnue");
                                        }
                                    }}
                                    className="text-xs text-muted-foreground hover:text-primary"
                                >
                                    <RefreshCw className="w-3 h-3 mr-2" /> Réparer les images non analysées
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {
                    hooks.length > 0 && (
                        <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {hooks.map((h, i) => (
                                <Card key={i}
                                    onClick={() => { setSelectedHook(h); setStep('config'); }}
                                    className={`cursor-pointer hover:border-primary transition-all group hover:scale-105 bg-card/40 backdrop-blur relative ${replacingIndex === i ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {/* Reject Button (Red Cross) */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 z-20 h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Cet angle ne vous plaît pas ? Je vais en générer un autre.")) {
                                                handleRejectHook(i, h);
                                            }
                                        }}
                                        title="Invalider et remplacer"
                                        disabled={replacingIndex === i}
                                    >
                                        {replacingIndex === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" />}
                                    </Button>

                                    {/* Type Badge */}
                                    <div className="absolute top-2 left-2 z-20">
                                        {h.type === 'wildcard' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/50">
                                                <Sparkles className="w-3 h-3 mr-1" /> WILDCARD
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/50">
                                                <Target className="w-3 h-3 mr-1" /> OPTIMIZED
                                            </span>
                                        )}
                                    </div>

                                    <CardHeader className="pt-8"> {/* Added padding for badge */}
                                        <div className="text-xs font-mono text-primary mb-2 uppercase tracking-wide">{h.angle}</div>
                                        <CardTitle className="leading-tight text-lg min-h-[60px]">"{h.hook}"</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{h.reason}</p>
                                    </CardContent>
                                    <CardFooter className="grid grid-cols-4 gap-2">
                                        <Button
                                            variant={savedIdeas.some(idea => idea.hookText === h.hook) ? "default" : "outline"}
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); handleSaveIdea(h); }}
                                            title={savedIdeas.some(idea => idea.hookText === h.hook) ? "Idée sauvegardée" : "Sauvegarder pour plus tard"}
                                            className={`transition-colors ${savedIdeas.some(idea => idea.hookText === h.hook)
                                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                                                }`}
                                        >
                                            <Bookmark className={`w-4 h-4 ${savedIdeas.some(idea => idea.hookText === h.hook) ? "fill-current" : ""}`} />
                                        </Button>
                                        <Button className="col-span-3 group-hover:bg-primary group-hover:text-primary-foreground" onClick={() => { setSelectedHook(h); setStep('config'); }}>
                                            Choisir cet angle
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )
                }

                {/* Drafts Section */}
                {
                    drafts.length > 0 && hooks.length === 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5" /> Reprendre un brouillon
                            </h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {drafts.map((draft) => (
                                    <Card key={draft.id} className="cursor-pointer hover:bg-muted/50 transition-colors group relative" onClick={() => resumeDraft(draft)}>
                                        <CardHeader className="pb-2 relative">
                                            <CardTitle className="text-base line-clamp-2 pr-8">{draft.hookText}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 text-xs">
                                                <Clock className="w-3 h-3" />
                                                {new Date(draft.createdAt).toLocaleDateString()}
                                            </CardDescription>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Supprimer ce brouillon ?")) {
                                                        handleDeleteDraft(draft.id);
                                                    }
                                                }}
                                                title="Supprimer le brouillon"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardFooter className="pt-2">
                                            <Button variant="ghost" size="sm" className="w-full justify-between group-hover:text-primary transition-colors">
                                                Continuer <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                }
            </div >
        );
    }

    // Step 2: Config (AI Strategy)
    if (step === 'config') {
        return (
            <div className="max-w-xl mx-auto space-y-8 py-12">
                <div className="space-y-2 text-center">
                    <h3 className="text-xl font-bold">Stratégie IA</h3>
                    <p className="text-muted-foreground">Hook choisi : "{selectedHook?.hook}"</p>
                </div>

                <Card className="p-6 space-y-8">
                    <div className="space-y-4 text-center">
                        <div className="p-4 bg-primary/10 rounded-xl mb-4">
                            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                            <h4 className="font-semibold text-primary">Mode Claude Opus Auto-Pilot</h4>
                            <p className="text-sm text-muted-foreground mt-2">
                                Je vais analyser la complexité de ce sujet pour déterminer le nombre de slides parfait (6 à 8) afin de maximiser la rétention.
                            </p>
                        </div>
                    </div>

                    <Button size="lg" className="w-full" onClick={handleGenerateCarousel} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 animate-spin" /> Rédaction & Recherche Images...
                            </>
                        ) : (
                            "Générer le Carrousel Optimisé"
                        )}
                    </Button>
                </Card>
                <Button variant="ghost" onClick={() => setStep('hooks')}>Retour</Button>
            </div>
        )
    }

    // Step 3: Preview
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">{initialPost ? 'Modifier le Post' : 'Preview du Carrousel'}</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (confirm("Voulez-vous vraiment annuler ? Les modifications non sauvegardées seront perdues.")) {
                                setStep('hooks');
                                setHooks([]);
                                setEditingId(null);
                            }
                        }}
                        disabled={isPending}
                        className="flex-1 md:flex-none text-muted-foreground hover:text-foreground"
                    >
                        Annuler
                    </Button>
                    {!initialPost && (
                        <Button variant="outline" onClick={() => handleSave(true)} disabled={isPending} className="flex-1 md:flex-none">
                            <FileText className="mr-2 h-4 w-4" />
                            <span className="truncate">Sauvegarder Brouillon</span>
                        </Button>
                    )}
                    <Button onClick={() => handleSave(false)} disabled={isPending} className="bg-secondary text-white hover:bg-secondary/90 flex-1 md:flex-none">
                        {isPending ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        {initialPost ? 'Enregistrer' : 'Valider'}
                    </Button>
                </div>
            </div>

            {/* Description Section */}
            <div className="flex justify-end mb-4">
                <Button onClick={handleDownloadImages} variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                    <ArrowRight className="w-4 h-4 rotate-90" /> Télécharger les images
                </Button>
            </div>

            <div className="bg-card/30 border border-border/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3>Description Générée (Optimisée pour le matching)</h3>
                </div>
                <div className="relative">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full min-h-[120px] bg-black/20 border border-white/10 rounded-lg p-4 text-sm resize-y focus:outline-none focus:border-primary/50 transition-colors"
                        placeholder="La description générée apparaîtra ici..."
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        {description.length} caractères
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-bold">Important :</span> Cette description sera utilisée pour faire le lien avec le post une fois publié sur TikTok.
                </p>
            </div>

            {/* Image Picker Dialog */}
            <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col pt-10">
                    <DialogHeader>
                        <DialogTitle>Choisir une image pour la Slide {pickingSlideIndex !== null ? pickingSlideIndex + 1 : ''}</DialogTitle>
                        <DialogDescription>
                            Sélectionnez une image de votre collection pour remplacer l'actuelle.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-[300px] p-2">
                        {isLoadingImages ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : userImages.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {userImages.map((img) => (
                                    <div
                                        key={img.id}
                                        className="relative aspect-[9/16] cursor-pointer group rounded-lg overflow-hidden border border-border/50 hover:border-primary transition-all"
                                        onClick={() => handleSelectImage(img)}
                                    >
                                        <img
                                            src={img.storageUrl}
                                            alt={img.descriptionLong || "Image"}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Check className="w-8 h-8 text-white drop-shadow-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <ImageIcon className="w-12 h-12 opacity-20" />
                                <p>Aucune image trouvée dans votre collection.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {slides.map((slide, index) => (
                    <Card key={`${slide.slide_number}-${index}`} className="overflow-hidden border-border/50 bg-card/30 flex flex-col group/card relative">
                        {/* Delete Button */}
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 left-2 z-20 h-6 w-6 opacity-0 group-hover/card:opacity-100 transition-opacity"
                            onClick={() => {
                                if (confirm("Supprimer cette slide ?")) handleDeleteSlide(index);
                            }}
                            title="Supprimer la slide"
                        >
                            <Trash className="w-3 h-3" />
                        </Button>

                        <div className="aspect-[9/16] bg-black relative group flex-shrink-0">
                            {slide.image_url ? (
                                <img src={slide.image_url} className="w-full h-full object-cover" alt="Slide visual" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                                    Pas d'image trouvée
                                </div>
                            )}

                            <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs pointer-events-none z-10">
                                {slide.slide_number}/{slides.length}
                            </div>
                        </div>

                        {/* Text Area - Below Image */}
                        <div className="flex-grow bg-card p-4 space-y-3 flex flex-col border-t border-border/50">
                            <textarea
                                value={slide.text}
                                onChange={(e) => handleTextChange(index, e.target.value)}
                                className="w-full min-h-[100px] flex-grow bg-muted/30 border border-transparent hover:border-border/50 focus:border-primary/50 text-foreground text-sm p-3 rounded-lg resize-none focus:outline-none transition-all placeholder:text-muted-foreground/50"
                                placeholder="Écrivez votre texte ici..."
                            />

                            <div className="flex items-center justify-between gap-2 pt-2">
                                <p className="text-[10px] text-muted-foreground font-mono uppercase truncate flex-1" title={slide.intention}>
                                    {slide.intention}
                                </p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="text-xs h-7 px-3 hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => handleOpenImagePicker(index)}
                                >
                                    Changer l'image
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}

                {/* Add Slide Button */}
                <Card className="border-dashed border-2 border-border/50 bg-card/10 flex flex-col items-center justify-center cursor-pointer hover:bg-card/20 hover:border-primary/50 transition-all min-h-[400px]" onClick={handleAddSlide}>
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Sparkles className="w-8 h-8" />
                        <span className="font-semibold">Ajouter une slide</span>
                    </div>
                </Card>
            </div>
        </div>
    );
}
