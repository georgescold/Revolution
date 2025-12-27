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
    title: z.string().optional(),
    description: z.string().optional(),
    date: z.string().optional(), // ISO date string
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
                title: formData.title || null,
                description: formData.description || null,
                hookText: formData.slides[0]?.text || "Untitled Post",
                slideCount: formData.slides.length,
                slides: JSON.stringify(formData.slides),
                origin: "imported",
                status: "published",
                createdAt: formData.date ? new Date(formData.date) : undefined, // Use provided date or default to now
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

export async function updateFollowers(count: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    try {
        // 1. Update Profile
        await prisma.profile.update({
            where: { id: activeProfileId },
            data: { followersCount: count }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 2. Update/Create Snapshot for today
        // const today = new Date(); // Already declared
        // today.setHours(0, 0, 0, 0); // Already set
        // const tomorrow = new Date(today); // Already declared
        // tomorrow.setDate(tomorrow.getDate() + 1); // Already set

        // Find ALL snapshots for today to clean up duplicates
        const todaysSnapshots = await prisma.analyticsSnapshot.findMany({
            where: {
                profileId: activeProfileId,
                metric: 'followers',
                date: {
                    gte: today,
                    lt: tomorrow
                }
            },
            orderBy: { date: 'desc' } // Latest first
        });

        if (todaysSnapshots.length > 0) {
            // Update the most recent one
            const latest = todaysSnapshots[0];
            await prisma.analyticsSnapshot.update({
                where: { id: latest.id },
                data: { value: count }
            });

            // Delete duplicates if any exist (cleanup old bad data)
            if (todaysSnapshots.length > 1) {
                const idsToDelete = todaysSnapshots.slice(1).map(s => s.id);
                await prisma.analyticsSnapshot.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
            }
        } else {
            // Create new if none exists
            await prisma.analyticsSnapshot.create({
                data: {
                    profileId: activeProfileId,
                    metric: 'followers',
                    value: count,
                    date: new Date() // Use exact time for precision
                }
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to update followers' };
    }
}

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { posts: [], stats: { views: 0, totalViews: 0, likes: 0, saves: 0, engagement: 0, engagementTrend: 'neutral', followers: 0, followersTrend: 0, followersTrendDirection: 'neutral' }, topPosts: [], history: { views: [], followers: [] } };

    const posts = await prisma.post.findMany({
        where: {
            userId: session.user.id,
            profileId: activeProfileId,
            status: { notIn: ['draft', 'idea'] }
        },
        include: { metrics: true },
        orderBy: { createdAt: 'desc' }
    });

    // --- Stats Calculation ---
    // Last 7 posts logic for Engagement
    const last7Posts = posts.slice(0, 7);
    const previous7Posts = posts.slice(7, 14);

    const viewsLast7 = last7Posts.reduce((sum, p) => sum + (p.metrics?.views || 0), 0);

    // Engagement = Views + Saves + Comments (simplified interactions)
    // Or just (Likes + Saves + Comments) / Views? Users usually mean Total Interactions here unless specified.
    // Based on previous code: sum of views+saves+comments (?) 
    // Wait, previous code was: sum + views + saves + comments. That's weird. "Engagement" usually excludes views. 
    // But I will stick to previous logic to avoid regression unless requested.
    // actually, let's look at previous code: `sum + (m?.views || 0) + ...`
    // User requested "Engagement ... +100%". 
    // I'll keep the same calc.

    const calcEngagement = (pList: any[]) => pList.reduce((sum, p) => sum + (p.metrics?.views || 0) + (p.metrics?.saves || 0) + (p.metrics?.comments || 0), 0);

    const engagementLast7 = calcEngagement(last7Posts);
    const engagementPrevious7 = calcEngagement(previous7Posts);

    let engagementTrend: 'up' | 'down' | 'neutral' = 'neutral';
    let engagementChange = 0;
    if (engagementPrevious7 > 0) {
        engagementChange = ((engagementLast7 - engagementPrevious7) / engagementPrevious7) * 100;
        engagementTrend = engagementChange > 0 ? 'up' : engagementChange < 0 ? 'down' : 'neutral';
    } else if (engagementLast7 > 0) {
        engagementChange = 100;
        engagementTrend = 'up';
    }

    // Top Posts
    const topPosts = [...posts]
        .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
        .slice(0, 10);

    const totalLikes = posts.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0);
    const totalSaves = posts.reduce((sum, p) => sum + (p.metrics?.saves || 0), 0);

    // --- History & Snapshots ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Ensure "Views" snapshot for today exists (Lazy Capture)
    const totalViewsAllTime = posts.reduce((sum, p) => sum + (p.metrics?.views || 0), 0);

    // We want "Views" history. 
    // If we only store "Total Views" in snapshot, the graph will show cumulative growth.
    // If we want "Daily Views", we need diffs. 
    // User asked "Graphique qui évolue au fil du temps". Total views growing is a fine graph.
    // Or daily views? Usually "Performance" implies daily activity.
    // BUT capturing daily activity requires knowing what happened *today*.
    // Using simple "Total Views" snapshot is easier and robust.

    const existingViewSnap = await prisma.analyticsSnapshot.findFirst({
        where: { profileId: activeProfileId, metric: 'views', date: today }
    });

    if (existingViewSnap) {
        // Update it (in case views increased since last load today)
        if (existingViewSnap.value !== totalViewsAllTime) {
            await prisma.analyticsSnapshot.update({ where: { id: existingViewSnap.id }, data: { value: totalViewsAllTime } });
        }
    } else {
        await prisma.analyticsSnapshot.create({
            data: { profileId: activeProfileId, metric: 'views', value: totalViewsAllTime, date: today }
        });
    }

    // 2. Fetch History (Last 180 days / 6 months)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 180);

    const snapshots = await prisma.analyticsSnapshot.findMany({
        where: {
            profileId: activeProfileId,
            date: { gte: thirtyDaysAgo }
        },
        orderBy: { date: 'asc' }
    });

    // Format for Recharts [{ date: 'DD/MM', value: 123 }]
    const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    const viewsHistory = snapshots.filter(s => s.metric === 'views').map(s => ({
        date: formatDate(s.date),
        value: s.value,
        originalDate: s.date
    }));

    const followersHistory = snapshots.filter(s => s.metric === 'followers').map(s => ({
        date: formatDate(s.date),
        value: s.value,
        originalDate: s.date
    }));

    // Followers Current
    const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
    const currentFollowers = profile?.followersCount || 0;

    // Calc Followers Trend (vs yesterday or last snapshot)
    let followersTrend = 0;
    let followersTrendDirection: 'up' | 'down' | 'neutral' = 'neutral';

    // Get last 2 followers snapshots
    const fSnaps = snapshots.filter(s => s.metric === 'followers');
    if (fSnaps.length >= 2) {
        const last = fSnaps[fSnaps.length - 1].value;
        const prev = fSnaps[fSnaps.length - 2].value;
        if (prev > 0) {
            followersTrend = ((last - prev) / prev) * 100;
            followersTrendDirection = followersTrend > 0 ? 'up' : followersTrend < 0 ? 'down' : 'neutral';
        }
    }

    return {
        posts,
        stats: {
            views: viewsLast7, // Keep this for the card number if desired, OR use totalViewsAllTime? User said "Vues (7 derniers)" in screenshot. I'll stick to that for the number, but provide total for graph? 
            // Actually user said: "je dois voir le chiffre et l'évolution...". 
            // If graph is total views, number should probably match.
            // But "Vues (7 derniers)" is specific. 
            // I'll return both. totalViews for graph, viewsLast7 for text if needed.
            totalViews: totalViewsAllTime,
            likes: totalLikes,
            saves: totalSaves,
            engagement: Math.round(engagementChange),
            engagementTrend,
            followers: currentFollowers,
            followersTrend: Math.round(followersTrend),
            followersTrendDirection
        },
        topPosts,
        history: {
            views: viewsHistory,
            followers: followersHistory
        }
    };
}

// Basic ML: Simple Linear Regression (Slide Count vs Views)
export async function getInsights() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const posts = await prisma.post.findMany({
        where: {
            userId: session.user.id,
            NOT: { metrics: null },
            status: { notIn: ['draft', 'idea'] }
        },
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

        const imageIds = slides.map((s: any) => s.imageId || s.image_id).filter(Boolean);

        // Fetch images to get URLs
        const images = await prisma.image.findMany({
            where: { id: { in: imageIds } },
            select: { id: true, storageUrl: true }
        });

        const imageMap = new Map(images.map(img => [img.id, img.storageUrl]));

        // Enrich slides with URLs
        const resolvedSlides = slides.map((slide: any) => ({
            ...slide,
            imageUrl: imageMap.get(slide.imageId || slide.image_id) || slide.imageUrl || slide.image_url || null
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

export async function updatePost(postId: string, data: { title?: string; description?: string; date?: string; slides?: any[]; metrics?: { views: number; likes: number; saves: number; comments: number } }) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.date !== undefined) updateData.createdAt = new Date(data.date);
        if (data.slides !== undefined) {
            // Update to support new CreationView Slide structure while maintaining backward compatibility where possible
            // We want to persist: slide_number, text, intention, image_id (or imageId)
            const sanitizedSlides = data.slides.map(s => {
                return {
                    slide_number: s.slide_number,
                    text: s.text,
                    intention: s.intention,
                    image_id: s.image_id || s.imageId, // Standardize on image_id? Or keep both? Let's keep data as passed mostly but ensure image ID is saved
                    imageId: s.imageId || s.image_id, // Keep redundant for now if other systems use it, or clean up later.
                    description: s.description || s.intention, // Map intention to description if missing
                    imageHumanId: s.imageHumanId
                };
            });
            updateData.slides = JSON.stringify(sanitizedSlides);
        }

        if (data.metrics) {
            updateData.metrics = {
                update: {
                    views: data.metrics.views,
                    likes: data.metrics.likes,
                    comments: data.metrics.comments,
                    saves: data.metrics.saves
                }
            };
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

