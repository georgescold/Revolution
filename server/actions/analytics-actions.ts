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

import { getActiveProfileId } from './profile-actions';

// ... (imports remain)

export async function addPost(formData: z.infer<typeof AddPostSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

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
                profileId: activeProfileId, // Link to active profile
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

    const activeProfileId = await getActiveProfileId(session.user.id);
    // If no profile, return empty stats or defaults
    if (!activeProfileId) return { posts: [], stats: { views: 0, likes: 0, saves: 0, engagement: 0, engagementTrend: 'neutral', followers: 0, followersTrend: 0, followersTrendDirection: 'neutral' }, topPosts: [] };

    const posts = await prisma.post.findMany({
        where: { userId: session.user.id, profileId: activeProfileId },
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

    // Get top 10 posts by views (we'll limit to 5 in UI but allow 10 on click)
    const topPosts = [...posts]
        .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
        .slice(0, 10);

    // Total stats (all posts)
    const totalLikes = posts.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0);
    const totalSaves = posts.reduce((sum, p) => sum + (p.metrics?.saves || 0), 0);

    // Followers Trend Logic - FETCH FOR ACTIVE PROFILE
    const currentFollowers = (await prisma.profile.findUnique({
        where: { id: activeProfileId },
        select: { followersCount: true }
    }))?.followersCount || 0;

    // Get previous snapshot (e.g., from > 1 day ago to see daily growth, or just the last distinct one)
    // For simplicity, let's get the most recent snapshot BEFORE the current value if feasible, or just the last one created.
    // Actually, we want to see growth trend. Let's compare current with the previous snapshot.
    const snapshots = await prisma.followerSnapshot.findMany({
        where: { userId: session.user.id, profileId: activeProfileId },
        orderBy: { createdAt: 'desc' },
        take: 2 // Current (if snapshot created on update) and Previous
    });

    let followersTrend = 0;
    let followersTrendDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (snapshots.length >= 2) {
        const currentSnap = snapshots[0].count; // This should match currentFollowers if we just updated
        const prevSnap = snapshots[1].count;

        if (prevSnap > 0) {
            followersTrend = ((currentSnap - prevSnap) / prevSnap) * 100;
            followersTrendDirection = followersTrend > 0 ? 'up' : followersTrend < 0 ? 'down' : 'neutral';
        } else if (currentSnap > 0) {
            followersTrend = 100;
            followersTrendDirection = 'up';
        }
    }

    return {
        posts,
        stats: {
            views: viewsLast7,
            likes: totalLikes,
            saves: totalSaves,
            engagement: Math.round(engagementChange),
            engagementTrend,
            followers: currentFollowers,
            followersTrend: Math.round(followersTrend),
            followersTrendDirection
        },
        topPosts,
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

export async function getPostDetails(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId, userId: session.user.id },
            include: { metrics: true }
        });

        if (!post) return { error: 'Post not found' };

        // Parse slides safely
        let slides = [];
        try {
            slides = post.slides ? JSON.parse(post.slides) : [];
        } catch (e) {
            console.error("Failed to parse slides JSON:", e);
            slides = [];
        }

        const imageIds = slides.map((s: any) => s.imageId).filter(Boolean);

        // Fetch images to get URLs
        const images = await prisma.image.findMany({
            where: { id: { in: imageIds } },
            select: { id: true, storageUrl: true }
        });

        const imageMap = new Map(images.map(img => [img.id, img.storageUrl]));

        // Enrich slides with URLs
        const resolvedSlides = slides.map((slide: any) => ({
            ...slide,
            imageUrl: imageMap.get(slide.imageId) || null
        }));

        // Convert Dates to strings to avoid serialization issues if any
        const safePost = {
            ...post,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            metrics: post.metrics ? {
                ...post.metrics,
                updatedAt: post.metrics.updatedAt.toISOString()
            } : null,
            slides: resolvedSlides
        };

        return {
            success: true,
            post: safePost
        };

    } catch (e) {
        console.error("Error fetching post details:", e);
        return { error: 'Failed to fetch details' };
    }
}

export async function updatePost(postId: string, data: { title?: string; description?: string; slides?: any[] }) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.slides !== undefined) {
            // Ensure we only store the necessary fields for slides, stripping any transient UI properties if necessary like 'imageUrl'
            // The schema expected is { imageId, imageHumanId, description, text }
            const sanitizedSlides = data.slides.map(s => ({
                imageId: s.imageId,
                imageHumanId: s.imageHumanId,
                description: s.description,
                text: s.text
            }));
            updateData.slides = JSON.stringify(sanitizedSlides);
        }

        await prisma.post.update({
            where: { id: postId, userId: session.user.id },
            data: updateData
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to update post' };
    }
}

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.delete({
            where: { id: postId, userId: session.user.id }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete post' };
    }
}

