'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EditPostDialog } from './edit-post-dialog';
import { EditSlideDialog } from './edit-slide-dialog';
import { Pencil } from 'lucide-react';

import { getPostDetails, updatePost } from '@/server/actions/analytics-actions';
import { toast } from 'sonner';
import { Loader2, Eye, Heart, MessageCircle, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

interface PostDetailsModalProps {
    postId: string;
    children: React.ReactNode;
    initialTitle?: string;
}

interface ResolvedSlide {
    imageId: string;
    imageHumanId: string;
    description: string;
    text: string;
    imageUrl?: string;
}

interface DetailedPost {
    id: string;
    title: string | null;
    description: string | null;
    hookText: string;
    platform: string;
    slides: ResolvedSlide[];
    metrics: {
        views: number;
        likes: number;
        comments: number;
        saves: number;
    } | null;
}

export function PostDetailsModal({ postId, children, initialTitle }: PostDetailsModalProps) {
    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [post, setPost] = useState<DetailedPost | null>(null);
    const [editingSlide, setEditingSlide] = useState<{ index: number; slide: ResolvedSlide } | null>(null);
    const [isEditingMetrics, setIsEditingMetrics] = useState(false);
    const [metricsForm, setMetricsForm] = useState<{
        views: string | number;
        likes: string | number;
        saves: string | number;
        comments: string | number;
    }>({ views: 0, likes: 0, saves: 0, comments: 0 });

    const handleOpenChange = async (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen && !post) {
            await fetchPost();
        }
    };

    const fetchPost = async () => {
        setLoading(true);
        try {
            const result = await getPostDetails(postId);
            if (result.success && result.post) {
                setPost(result.post as unknown as DetailedPost);
                if (result.post.metrics) {
                    setMetricsForm({
                        views: result.post.metrics.views,
                        likes: result.post.metrics.likes,
                        saves: result.post.metrics.saves,
                        comments: result.post.metrics.comments
                    });
                }
            } else {
                toast.error("Impossible de charger les détails du post");
            }
        } catch (e) {
            toast.error("Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-white/10">
                <DialogHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                        <DialogTitle className="text-2xl font-bold font-display">
                            {post?.title || initialTitle || "Détails du post"}
                        </DialogTitle>
                        <DialogDescription>
                            {post?.hookText}
                        </DialogDescription>
                    </div>
                    {post && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditOpen(true)}
                            title="Modifier le post"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                </DialogHeader>

                {post && (
                    <EditPostDialog
                        open={editOpen}
                        onOpenChange={(open) => {
                            setEditOpen(open);
                            if (!open) fetchPost(); // Refresh details on close
                        }}
                        post={{
                            id: post.id,
                            title: post.title,
                            description: post.description,
                            hookText: post.hookText,
                            slides: post.slides
                        }}
                    />
                )}


                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : post ? (
                    <div className="space-y-8 py-4">
                        {/* Metrics Bar */}
                        {/* Metrics Bar */}
                        <div className="relative p-6 rounded-xl bg-white/5 border border-white/10 group/metrics">
                            {!isEditingMetrics && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover/metrics:opacity-100 transition-opacity">
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingMetrics(true)} title="Modifier les stats">
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}

                            {isEditingMetrics ? (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap items-end justify-center gap-6">
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> Vues</label>
                                            <input
                                                type="number"
                                                value={metricsForm.views}
                                                onChange={(e) => setMetricsForm({ ...metricsForm, views: e.target.value })}
                                                className="bg-transparent border-b border-white/20 w-24 text-center font-bold text-lg focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" /> Likes</label>
                                            <input
                                                type="number"
                                                value={metricsForm.likes}
                                                onChange={(e) => setMetricsForm({ ...metricsForm, likes: e.target.value })}
                                                className="bg-transparent border-b border-white/20 w-24 text-center font-bold text-lg focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground flex items-center gap-1"><Bookmark className="w-3 h-3" /> Saves</label>
                                            <input
                                                type="number"
                                                value={metricsForm.saves}
                                                onChange={(e) => setMetricsForm({ ...metricsForm, saves: e.target.value })}
                                                className="bg-transparent border-b border-white/20 w-24 text-center font-bold text-lg focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Coms</label>
                                            <input
                                                type="number"
                                                value={metricsForm.comments}
                                                onChange={(e) => setMetricsForm({ ...metricsForm, comments: e.target.value })}
                                                className="bg-transparent border-b border-white/20 w-24 text-center font-bold text-lg focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-2 pt-2">
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditingMetrics(false)}>Annuler</Button>
                                        <Button size="sm" onClick={async () => {
                                            if (!post) return;
                                            // Parse strings back to numbers
                                            const metricsToSave = {
                                                views: Number(metricsForm.views) || 0,
                                                likes: Number(metricsForm.likes) || 0,
                                                saves: Number(metricsForm.saves) || 0,
                                                comments: Number(metricsForm.comments) || 0
                                            };
                                            const res = await updatePost(post.id, { metrics: metricsToSave });
                                            if (res.success) {
                                                toast.success("Stats mises à jour !");
                                                setIsEditingMetrics(false);
                                                fetchPost(); // Refresh
                                            } else {
                                                toast.error("Erreur mise à jour");
                                            }
                                        }}>Sauvegarder</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap justify-center gap-8">
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-5 h-5 text-blue-500" />
                                        <span className="font-bold text-lg">{post.metrics?.views.toLocaleString()}</span>
                                        <span className="text-sm text-muted-foreground">vues</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                                        <span className="font-bold text-lg">{post.metrics?.likes.toLocaleString()}</span>
                                        <span className="text-sm text-muted-foreground">likes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Bookmark className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                        <span className="font-bold text-lg">{post.metrics?.saves.toLocaleString()}</span>
                                        <span className="text-sm text-muted-foreground">saves</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5 text-green-500" />
                                        <span className="font-bold text-lg">{post.metrics?.comments.toLocaleString()}</span>
                                        <span className="text-sm text-muted-foreground">coms</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Slides Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <span className="w-1 h-6 bg-primary rounded-full" />
                                    Slides ({post.slides.length})
                                </h3>
                                <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                    Modifier / Ajouter
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {post.slides.map((slide, index) => (
                                    <Card
                                        key={index}
                                        className="overflow-hidden border-border/50 bg-black/20 group hover:border-primary/50 transition-colors cursor-pointer"
                                        onClick={() => setEditOpen(true)} // Opens full editor
                                    >
                                        <div className="relative aspect-[9/16] w-full">
                                            {slide.imageUrl ? (
                                                <Image
                                                    src={slide.imageUrl}
                                                    alt={slide.text}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                                    <span className="text-muted-foreground text-xs">Image manquante</span>
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-xs font-bold border border-white/20 text-white">
                                                {index + 1}
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <p className="text-sm font-medium line-clamp-3 text-pretty">
                                                {slide.text}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        Détails non disponibles
                    </div>
                )}

                {editingSlide && (
                    <EditSlideDialog
                        key={`edit-slide-${editingSlide.index}`}
                        open={!!editingSlide}
                        onOpenChange={(open) => !open && setEditingSlide(null)}
                        slide={editingSlide.slide}
                        onSave={async (newText) => {
                            if (!post) return;

                            // 1. Create new slides array
                            const newSlides = [...post.slides];
                            newSlides[editingSlide.index] = {
                                ...newSlides[editingSlide.index],
                                text: newText
                            };

                            // 2. Optimistic update (optional but good UI)
                            setPost({ ...post, slides: newSlides });

                            // 3. Server update
                            const res = await updatePost(post.id, { slides: newSlides });
                            if (res.success) {
                                toast.success("Slide mise à jour");
                            } else {
                                toast.error("Erreur lors de la mise à jour");
                                fetchPost(); // Revert on error
                            }
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
