'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PROMPTS } from '@/lib/ai/prompts';
import { getActiveProfileId } from './profile-actions';
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
// Valid model enforced by user request
const MODEL = 'claude-opus-4-5-20251101';

// Types
export type HookProposal = {
    id: string; // generated uuid
    angle: string;
    hook: string;
    reason: string;
};

export type Slide = {
    slide_number: number;
    text: string;
    intention: string;
    image_id?: string;
    image_url?: string;
};

export async function generateHooks() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
    const stats = await prisma.metrics.findMany({
        take: 5,
        orderBy: { views: 'desc' },
        include: { post: true }
    });

    // Construct context
    const context = `
    User Persona: ${profile?.persona || "Creator"}
    Goal: ${profile?.contentGoal || "Viral content"}
    Top Posts Hooks: ${stats.map(s => s.post.hookText).join('\n')}
    `;

    try {
        const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: PROMPTS.HOOK_GENERATION_SYSTEM + " Return JSON array of 3 hooks objects {angle, hook, reason}.",
            messages: [{ role: "user", content: `Context:\n${context}\n\nPropose 3 viral hooks.` }]
        });

        const text = (msg.content[0] as any).text;
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const hooks = JSON.parse(cleanJson);
        return { hooks };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to generate hooks' };
    }
}

export async function generateCarousel(hook: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // 1. Generate Slides Content
    let slides: Slide[] = [];
    try {
        const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: PROMPTS.SLIDE_GENERATION_SYSTEM + " You are a viral content strategist. Determine the optimal number of slides (strictly between 6 and 8) to maximize retention for this specific hook. Return ONLY a JSON array of 6, 7, or 8 slides: {slide_number, text, intention}.",
            messages: [{ role: "user", content: `Hook: "${hook}". Generate an optimal viral carousel (6-8 slides).` }]
        });
        const text = (msg.content[0] as any).text;
        slides = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    } catch (e) {
        return { error: 'Failed to generate slides' };
    }

    // 2. Fetch Candidate Images
    // Logic: exclude images utilized in last 3 posts
    const lastPosts = await prisma.post.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { slides: true }
    });

    const usedImageIds = new Set<string>();
    lastPosts.forEach(p => {
        try {
            const s = JSON.parse(p.slides || '[]') as Slide[];
            s.forEach(slide => {
                if (slide.image_id) usedImageIds.add(slide.image_id);
            });
        } catch (e) {
            // ignore
        }
    });

    const images = await prisma.image.findMany({
        where: {
            userId: session.user.id,
            id: { notIn: Array.from(usedImageIds) }
        },
        select: { id: true, humanId: true, descriptionLong: true, keywords: true, storageUrl: true }
    });

    if (images.length === 0) {
        return { slides, warning: "Pas assez d'images disponibles (filtre anti-répétition activé)." };
    }

    // 3. Match Images (Claude)
    try {
        const slidesText = slides.map(s => `Slide ${s.slide_number}: ${s.text} (Intention: ${s.intention})`).join('\n');
        // Limit context to 50 images to avoid token limits
        const candidateImages = images.sort(() => Math.random() - 0.5).slice(0, 50);
        const imagesText = candidateImages.map(i => `ID: ${i.id}, Desc: ${i.descriptionLong}, Keywords: ${i.keywords}`).join('\n---\n');

        const prompt = `
        Assign the best image to each slide based on description matching.
        Constraint: DO NOT repeat the same image ID. Each slide MUST have a unique image_id.
        Return JSON object where keys are slide numbers (1, 2...) and values are image IDs.
        Example: { "1": "uuid...", "2": "uuid..." }
        
        Slides:
        ${slidesText}
        
        Available Images:
        ${imagesText}
        `;

        const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }]
        });
        const text = (msg.content[0] as any).text;
        const mapping = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());

        // Apply mapping
        const usedInThisCarousel = new Set<string>();

        slides = slides.map(s => {
            let imgId = mapping[s.slide_number.toString()] || mapping[s.slide_number];

            // Enforce uniqueness locally if Claude failed
            if (usedInThisCarousel.has(imgId)) {
                imgId = null; // Reset if duplicate
            }

            // Fallback strategy if needed could go here

            if (imgId) usedInThisCarousel.add(imgId);

            const img = images.find(i => i.id === imgId);
            return {
                ...s,
                image_id: img?.id,
                image_url: img?.storageUrl
            };
        });

    } catch (e) {
        console.error("Matching failed", e);
        // Return slides without images
    }

    return { slides };
}

export async function saveCarousel(hook: string, slides: Slide[], status: 'created' | 'draft' = 'created') {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.create({
            data: {
                userId: session.user.id,
                platform: 'tiktok', // default for generated
                hookText: hook,
                slideCount: slides.length,
                slides: JSON.stringify(slides),
                status: status,
                metrics: { create: {} }
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to save post' };
    }
}

export async function getDrafts() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const drafts = await prisma.post.findMany({
            where: {
                userId: session.user.id,
                status: 'draft'
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, drafts };
    } catch (e) {
        return { error: 'Failed to fetch drafts' };
    }
}

export async function saveHookAsIdea(hookProposal: HookProposal) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.create({
            data: {
                userId: session.user.id,
                platform: 'tiktok',
                hookText: hookProposal.hook,
                title: hookProposal.angle,
                description: hookProposal.reason,
                status: 'idea',
                slides: '[]',
                metrics: { create: {} }
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to save idea' };
    }
}

export async function getSavedIdeas() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const ideas = await prisma.post.findMany({
            where: {
                userId: session.user.id,
                status: 'idea'
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, ideas };
    } catch (e) {
        return { error: 'Failed to fetch ideas' };
    }
}

export async function getPost(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post || post.userId !== session.user.id) return { error: 'Post not found' };

        return { success: true, post };
    } catch (e) {
        return { error: 'Failed to fetch post' };
    }
}

export async function updatePostContent(postId: string, slides: Slide[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.update({
            where: { id: postId, userId: session.user.id },
            data: {
                slides: JSON.stringify(slides),
                slideCount: slides.length,
                updatedAt: new Date()
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to update post content' };
    }
}
