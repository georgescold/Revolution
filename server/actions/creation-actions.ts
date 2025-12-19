'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PROMPTS } from '@/lib/ai/prompts';
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';

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

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
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

export async function generateCarousel(hook: string, count: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // 1. Generate Slides Content
    let slides: Slide[] = [];
    try {
        const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: PROMPTS.SLIDE_GENERATION_SYSTEM + ` Return JSON array of ${count} slides: {slide_number, text, intention}.`,
            messages: [{ role: "user", content: `Hook: "${hook}". Generate ${count} slides.` }]
        });
        const text = (msg.content[0] as any).text;
        slides = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    } catch (e) {
        return { error: 'Failed to generate slides' };
    }

    // 2. Fetch Candidate Images
    // Logic: exclude images utilized in last 10 posts
    // We haven't implemented post_seq tracking fully on writes yet, but let's just get all images and filtering by lastUsedPostSeq if we had it.
    // Simplifying: Fetch all images, let Claude pick best fit.
    const images = await prisma.image.findMany({
        where: { userId: session.user.id },
        select: { id: true, humanId: true, descriptionLong: true, keywords: true, storageUrl: true }
    });

    if (images.length === 0) {
        return { slides, warning: "No images found in collection." };
    }

    // 3. Match Images (Claude)
    try {
        const slidesText = slides.map(s => `Slide ${s.slide_number}: ${s.text} (Intention: ${s.intention})`).join('\n');
        const imagesText = images.map(i => `ID: ${i.id}, Desc: ${i.descriptionLong}, Keywords: ${i.keywords}`).join('\n---\n');

        const prompt = `
        Assign the best image to each slide based on description matching.
        Constraint: DO NOT repeat the same image ID.
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
        slides = slides.map(s => {
            const imgId = mapping[s.slide_number.toString()] || mapping[s.slide_number];
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

export async function saveCarousel(hook: string, slides: Slide[]) {
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
                status: 'created',
                metrics: { create: {} }
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to save post' };
    }
}
