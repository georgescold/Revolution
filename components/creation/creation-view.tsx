'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateHooks, generateCarousel, saveCarousel, getDrafts, updatePostContent, saveHookAsIdea, getSavedIdeas, HookProposal, Slide } from '@/server/actions/creation-actions';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, RefreshCw, FileText, Clock, ArrowRight, Bookmark, Lightbulb, User } from 'lucide-react';


interface CreationViewProps {
    initialPost?: {
        id: string;
        hookText: string;
        slides: string; // JSON string
        status: string;
    };
}

export function CreationView({ initialPost }: CreationViewProps) {
    const [step, setStep] = useState<'hooks' | 'config' | 'preview'>('hooks');
    const [hooks, setHooks] = useState<HookProposal[]>([]);
    const [selectedHook, setSelectedHook] = useState<HookProposal | null>(null);

    const [slides, setSlides] = useState<Slide[]>([]);
    const [drafts, setDrafts] = useState<any[]>([]);
    const [savedIdeas, setSavedIdeas] = useState<any[]>([]);

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (initialPost) {
            try {
                const parsedSlides = JSON.parse(initialPost.slides);
                setSlides(parsedSlides);
                setSelectedHook({
                    id: 'edit',
                    angle: 'Edit',
                    hook: initialPost.hookText,
                    reason: 'Editing existing post'
                });
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

    const handleGenerateHooks = () => {
        startTransition(async () => {
            const result = await generateHooks();
            if (result.error) toast.error(result.error);
            else if (result.hooks) {
                setHooks(result.hooks);
            }
        });
    };

    const handleGenerateCarousel = () => {
        if (!selectedHook) return;
        startTransition(async () => {
            const result = await generateCarousel(selectedHook.hook);
            if (result.error) toast.error(result.error);
            else if (result.slides) {
                setSlides(result.slides);
                setStep('preview');
            }
        });
    };

    const handleSave = (asDraft = false) => {
        startTransition(async () => {
            if (!selectedHook) return;

            if (initialPost && !asDraft) {
                // Update existing post
                const res = await updatePostContent(initialPost.id, slides);
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success("Modifications enregistrées !");
                // Don't reset state if editing, maybe redirect? For now stay on page.
                // window.location.href = '/dashboard'; // Let user decide when to leave
            } else {
                // Create new or save draft
                const res = await saveCarousel(selectedHook.hook, slides, asDraft ? 'draft' : 'created');
                if (res.error) {
                    toast.error(res.error);
                    return;
                }
                toast.success(asDraft ? "Brouillon sauvegardé !" : "Carrousel sauvegardé !");
                if (!initialPost) {
                    setStep('hooks');
                    setHooks([]);
                }
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
            setSelectedHook({ id: 'draft', angle: 'Draft', hook: draft.hookText, reason: 'Resume' });
            setStep('preview');
        } catch (e) {
            toast.error("Impossible d'ouvrir ce brouillon");
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
                        </CardContent>
                    </Card>
                </div>

                {hooks.length > 0 && (
                    <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {hooks.map((h, i) => (
                            <Card key={i}
                                onClick={() => { setSelectedHook(h); setStep('config'); }}
                                className="cursor-pointer hover:border-primary transition-all group hover:scale-105 bg-card/40 backdrop-blur"
                            >
                                <CardHeader>
                                    <div className="text-xs font-mono text-primary mb-2 uppercase tracking-wide">{h.angle}</div>
                                    <CardTitle className="leading-tight text-lg min-h-[60px]">"{h.hook}"</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{h.reason}</p>
                                </CardContent>
                                <CardFooter className="grid grid-cols-4 gap-2">
                                    <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleSaveIdea(h); }} title="Sauvegarder pour plus tard">
                                        <Bookmark className="w-4 h-4" />
                                    </Button>
                                    <Button className="col-span-3 group-hover:bg-primary group-hover:text-primary-foreground" onClick={() => { setSelectedHook(h); setStep('config'); }}>
                                        Choisir cet angle
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Drafts Section */}
                {drafts.length > 0 && hooks.length === 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Reprendre un brouillon
                        </h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {drafts.map((draft) => (
                                <Card key={draft.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => resumeDraft(draft)}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base line-clamp-2">{draft.hookText}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 text-xs">
                                            <Clock className="w-3 h-3" />
                                            {new Date(draft.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="pt-2">
                                        <Button variant="ghost" size="sm" className="w-full justify-between group">
                                            Continuer <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
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
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{initialPost ? 'Modifier le Post' : 'Preview du Carrousel'}</h2>
                <div className="flex gap-2">
                    {!initialPost && (
                        <Button variant="outline" onClick={() => handleSave(true)} disabled={isPending}>
                            <FileText className="mr-2 h-4 w-4" />
                            Sauvegarder Brouillon
                        </Button>
                    )}
                    <Button onClick={() => handleSave(false)} disabled={isPending} className="bg-secondary text-white hover:bg-secondary/90">
                        {isPending ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        {initialPost ? 'Enregistrer les modifications' : 'Valider & Enregistrer'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {slides.map((slide) => (
                    <Card key={slide.slide_number} className="overflow-hidden border-border/50 bg-card/30">
                        <div className="aspect-[9/16] bg-black relative group">
                            {slide.image_url ? (
                                <img src={slide.image_url} className="w-full h-full object-cover opacity-80" alt="Slide visual" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                                    Pas d'image trouvée
                                </div>
                            )}

                            {/* Text Overlay Simulation */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-center items-center text-center bg-black/40">
                                <p className="text-white font-bold text-lg drop-shadow-md">{slide.text}</p>
                            </div>

                            <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                                {slide.slide_number}/{slides.length}
                            </div>
                        </div>
                        <CardContent className="p-4 space-y-2">
                            <p className="text-xs text-muted-foreground font-mono uppercase">Intention : {slide.intention}</p>
                            {/* Feature: Change Image Button */}
                            <div className="pt-2">
                                <Button variant="secondary" size="sm" className="w-full text-xs h-7">Changer l'image</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
