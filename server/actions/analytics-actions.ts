'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SlideSchema = z.object({
    imageId: z.string(),
    imageHumanId: z.string(),
    description: z.string(),
    text: z.string(),
});

const AddPostSchema = z.object({
    platform: z.enum(['tiktok', 'instagram']),
    slides: z.array(SlideSchema).min(1, "Au moins une slide est requise"),
    views: z.coerce.number().default(0),
    likes: z.coerce.number().default(0),
    comments: z.coerce.number().default(0),
    saves: z.coerce.number().default(0),
});

export async function addPost(formData: z.infer<typeof AddPostSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Validate that all images exist in user's collection
        const userImages = await prisma.image.findMany({
            where: { userId: session.user.id },
            select: { id: true }
        });

        const userImageIds = new Set(userImages.map(img => img.id));

        for (const slide of formData.slides) {
            if (!userImageIds.has(slide.imageId)) {
                return { error: `Image ${slide.imageHumanId} n'existe pas dans votre collection` };
            }
        }

        const post = await prisma.post.create({
            data: {
                userId: session.user.id,
                platform: formData.platform,
                hookText: formData.slides[0]?.text || "Untitled Post",
                slideCount: formData.slides.length,
                slides: JSON.stringify(formData.slides),
                origin: "imported",
                status: "published",
                metrics: {
                    create: {
                        views: formData.views,
                        likes: formData.likes,
                        comments: formData.comments,
                        saves: formData.saves
                    }
                }
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to add post' };
    }
}

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const posts = await prisma.post.findMany({
        where: { userId: session.user.id },
        include: { metrics: true },
        orderBy: { createdAt: 'desc' }
    });


    // Get last 14 posts to calculate engagement trend
    const last14Posts = posts.slice(0, 14);
    const last7Posts = last14Posts.slice(0, 7);
    const previous7Posts = last14Posts.slice(7, 14);

    // Calculate views for last 7 posts
    const viewsLast7 = last7Posts.reduce((sum, p) => sum + (p.metrics?.views || 0), 0);

    // Calculate engagement (views + saves + comments) for last 7 posts
    const engagementLast7 = last7Posts.reduce((sum, p) => {
        const m = p.metrics;
        return sum + (m?.views || 0) + (m?.saves || 0) + (m?.comments || 0);
    }, 0);

    // Calculate engagement for previous 7 posts
    const engagementPrevious7 = previous7Posts.reduce((sum, p) => {
        const m = p.metrics;
        return sum + (m?.views || 0) + (m?.saves || 0) + (m?.comments || 0);
    }, 0);

    // Calculate engagement % change
    let engagementChange = 0;
    let engagementTrend: 'up' | 'down' | 'neutral' = 'neutral';

    if (engagementPrevious7 > 0) {
        engagementChange = ((engagementLast7 - engagementPrevious7) / engagementPrevious7) * 100;
        engagementTrend = engagementChange > 0 ? 'up' : engagementChange < 0 ? 'down' : 'neutral';
    } else if (engagementLast7 > 0) {
        engagementChange = 100; // First posts, 100% increase
        engagementTrend = 'up';
    }

    // Get top 5 posts by views
    const topPosts = [...posts]
        .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
        .slice(0, 5);

    // Total stats (all posts)
    const totalLikes = posts.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0);
    const totalSaves = posts.reduce((sum, p) => sum + (p.metrics?.saves || 0), 0);

    return {
        posts,
        stats: {
            views: viewsLast7, // Last 7 posts only
            likes: totalLikes,
            saves: totalSaves,
            engagement: Math.round(engagementChange), // % change
            engagementTrend, // 'up', 'down', or 'neutral'
        },
        topPosts, // Top 5 by views
    };
}

// Basic ML: Simple Linear Regression (Slide Count vs Views)
export async function getInsights() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const posts = await prisma.post.findMany({
        where: { userId: session.user.id, NOT: { metrics: null } },
        include: { metrics: true }
    });

    if (posts.length < 3) return ["Pas assez de données pour l'apprentissage."];

    // Data points: [SlideCount, Views]
    const data = posts.map(p => ({ x: p.slideCount || 0, y: p.metrics?.views || 0 }));

    // Calculate mean
    const xMean = data.reduce((a, b) => a + b.x, 0) / data.length;
    const yMean = data.reduce((a, b) => a + b.y, 0) / data.length;

    // Calculate slope (m) and intercept (b)
    const numerator = data.reduce((acc, point) => acc + (point.x - xMean) * (point.y - yMean), 0);
    const denominator = data.reduce((acc, point) => acc + Math.pow(point.x - xMean, 2), 0);

    const slope = denominator !== 0 ? numerator / denominator : 0;

    const insights = [];
    if (slope > 50) {
        insights.push(`Tendance : Chaque slide supplémentaire ajoute environ ${Math.round(slope)} vues.`);
    } else if (slope < -50) {
        insights.push(`Attention : Les carrousels trop longs semblent réduire les vues (${Math.round(slope)} vues par slide).`);
    } else {
        insights.push("Impact neutre de la longueur du carrousel pour l'instant.");
    }

    // Engagement analysis
    const bestPost = posts.sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0))[0];
    if (bestPost) {
        insights.push(`Ton champion : "${bestPost.hookText}" avec ${bestPost.metrics?.likes} likes.`);
    }

    return insights;
}
