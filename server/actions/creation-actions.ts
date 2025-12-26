'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PROMPTS } from '@/lib/ai/prompts';
import { getActiveProfileId } from './profile-actions';
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';

// Valid model enforced by user request
const MODEL = 'claude-opus-4-5-20251101';
const VIRAL_THRESHOLD = 10000;

// Helper to get client (User Key strict mode)
// Returns { client: Anthropic }
async function getAnthropicClient(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { anthropicApiKey: true }
    });

    const userKey = user?.anthropicApiKey;

    if (userKey && userKey.trim().length > 0) {
        return {
            client: new Anthropic({ apiKey: userKey })
        };
    }

    throw new Error("Clé API manquante. Veuillez configurer votre clé dans les réglages.");
}

// Types
export type HookProposal = {
    id: string; // generated uuid
    angle: string;
    hook: string;
    reason: string; // The "Hypothesis"
    type?: 'wildcard' | 'optimized'; // [NEW] To identify innovation
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

    // [AI CLIENT SETUP]
    const { client: anthropic } = await getAnthropicClient(session.user.id);

    // [DEEP LEARNING ENGINE]
    // 1. Fetch extensive history to identify patterns
    const recentMetrics = await prisma.metrics.findMany({
        where: {
            post: {
                profileId: activeProfileId,
                status: { not: 'draft' }
            }
        },
        take: 100,
        orderBy: { views: 'desc' },
        include: { post: true }
    });

    // 2. Segment Data
    const viralPosts = recentMetrics.filter(m => m.views >= VIRAL_THRESHOLD);
    const flopPosts = recentMetrics.length > 10 ? recentMetrics.slice(-5) : [];

    // 2b. Negative Learning
    const rejectedPosts = await prisma.post.findMany({
        where: {
            profileId: activeProfileId,
            status: 'rejected'
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
    });

    // 3. Construct "Brain" Context
    const authority = profile?.persona || "Expert Creator"; // "Autorité"
    const targetAudience = (profile as any)?.targetAudience || "General Audience"; // "Persona" (Target Audience)
    const tone = "Authentic, engaging, and direct";

    const viralContext = viralPosts.length > 0
        ? `🏆 VIRAL KNOWLEDGE BASE (These worked perfectly - MIMIC THIS STYLE):
           ${viralPosts.map(m => `- Hook: "${m.post.hookText}" (Views: ${m.views})`).join('\n')}`
        : "No viral posts detected yet (>10k views). Using industry best practices.";

    const flopContext = flopPosts.length > 0
        ? `⚠️ FAILURE ANALYSIS (These failed - AVOID THIS):
           ${flopPosts.map(m => `- Hook: "${m.post.hookText}" (Views: ${m.views})`).join('\n')}`
        : "";

    const rejectedContext = rejectedPosts.length > 0
        ? `❌ NEGATIVE LEARNING (The user explicitly REJECTED these angles - DO NOT REPEAT):
           ${rejectedPosts.map(p => `- Rejected Angle: "${p.title}" | Hook: "${p.hookText}"`).join('\n')}`
        : "";

    const systemPrompt = `
    You are an advanced AI Content Strategist for the profile "${profile?.tiktokName}".
    
    OBJECTIVE:
    Your goal is to generate 3 viral hooks that will exceed ${VIRAL_THRESHOLD} views.
    You must learn from the provided history and fully embody the persona.
    
    PERSONA & AUDIENCE:
    - You represent (AUTHORITY): ${authority}
    - Your Audience (TARGET): ${targetAudience}
    - Your Tone: ${tone}
    - SPEAK EXACTLY LIKE THE PROFIL to the TARGET AUDIENCE. Use the same vocabulary, sentence depth, and phrasing as the "Viral Knowledge Base".
    
    CONSTRAINTS:
    - FORBIDDEN: Do NOT use the arrow character '→' in any text. Use "->" or simply words if needed.
    
    SCIENTIFIC METHOD:
    1. ANALYZE: Look at the Viral vs Flop data. What makes the difference? (Keywords? Length? Controversy? Question vs Statement?)
    2. LEARN: Review the "NEGATIVE LEARNING" list. Ensure your new ideas are distinct from these rejected concepts.
    3. HYPOTHESIZE: Formulate a strategy.
    
    TASK: Generate exactly 3 hooks:
    - Hook 1 & 2: "OPTIMIZED" - Safe bets based on what works (Viral Knowledge Base).
    - Hook 3: "WILDCARD" - A totally different, innovative angle/format to test new waters. (Must still fit persona).
    
    OUTPUT FORMAT (JSON Only):
    [
        {
            "angle": "Concept Name",
            "hook": "The actual text on screen",
            "reason": "ANALYSIS: Why this works.",
            "type": "optimized" // or "wildcard"
        }
    ]
    `;

    try {
        const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{
                role: "user", content: `
            CONTEXT DATA:
            ${viralContext}
            
            ${flopContext}

            ${rejectedContext}
            
            TASK:
            Generate 3 new viral hooks (2 Optimized, 1 Wildcard). Apply the "Viral Knowledge" strictly and AVOID the Rejected concepts.` }]
        });

        const text = (msg.content[0] as any).text;
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const hooks = JSON.parse(cleanJson);
        return { hooks };
    } catch (e: any) {
        console.error("Hook Generation Error:", e);
        return { error: `Erreur: ${e.message || 'Génération échouée'}` };
    }
}

export async function rejectHook(hookProposal: HookProposal) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const activeProfileId = await getActiveProfileId(session.user.id);

        // Save as rejected to avoid reproposing (persisted memory)
        // We use the 'post' table with status 'rejected'
        await prisma.post.create({
            data: {
                userId: session.user.id,
                profileId: activeProfileId,
                platform: 'tiktok',
                hookText: hookProposal.hook,
                title: hookProposal.angle,
                description: `REJECTED: ${hookProposal.reason}`,
                status: 'rejected',
                slides: '[]',
                metrics: { create: {} }
            }
        });
        return { success: true };
    } catch (e) {
        return { error: 'Failed to reject hook' };
    }
}

// ... (generateReplacementHook)
export async function generateReplacementHook(rejectedHook: HookProposal) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    const { client } = await getAnthropicClient(session.user.id);

    // Generate a single replacement
    const systemPrompt = `
    You are an advanced AI Content Strategist.
    You previously proposed a hook that was REJECTED by the creator.
    
    REJECTED HOOK: "${rejectedHook.hook}" (Angle: ${rejectedHook.angle})
    
    TASK:
    Generate 1 NEW, DIFFERENT viral hook.
    - Do NOT propose anything similar to the rejected one.
    - Try a different angle or emotional trigger.
    - FORBIDDEN: Do NOT use the arrow character '→'.
    
    OUTPUT FORMAT (JSON object only, NOT array):
    {
        "angle": "Concept Name",
        "hook": "The actual text on screen",
        "reason": "Why this new angle is better."
    }
    `;

    try {
        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 500,
            system: systemPrompt,
            messages: [{ role: "user", content: "Generate replacement hook." }]
        });

        const text = (msg.content[0] as any).text;
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const hook = JSON.parse(cleanJson);
        return { hook };
    } catch (e: any) {
        return { error: `Erreur API: ${e.message}` };
    }
}

export async function generateCarousel(hook: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const { client } = await getAnthropicClient(session.user.id);

    // 1. Generate Slides Content AND Description
    let slides: Slide[] = [];
    let description = "";

    // [DEEP LEARNING] Fetch Viral Context for Descriptions
    const activeProfileId = await getActiveProfileId(session.user.id);
    const profile = await prisma.profile.findUnique({ where: { id: activeProfileId } });
    const defaultHashtags = profile?.hashtags || "";

    const leadMagnet = (profile as any)?.leadMagnet || "Follow for more";
    const targetAudience = (profile as any)?.targetAudience || "General Audience";
    const authority = profile?.persona || "Expert Creator";

    const viralPosts = await prisma.metrics.findMany({
        where: {
            views: { gte: VIRAL_THRESHOLD },
            post: { profileId: activeProfileId }
        },
        take: 3,
        include: { post: true }
    });

    const descriptionStyleContext = viralPosts.length > 0
        ? `LEARNING DATA (These descriptions went viral - MIMIC THIS STYLE):
           ${viralPosts.map(p => `Example: "${p.post.description}"`).join('\n\n')}`
        : "Style: Engaging, personal, with best-practice hashtags.";

    try {
        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: PROMPTS.SLIDE_GENERATION_SYSTEM + `
            
            TASK ADDITION:
            Also generate a viral TikTok/Instagram description.
            
            PERSONA ALIGNMENT (CRITICAL):
            - You represent (AUTHORITY): ${authority}
            - Your Audience (TARGET): ${targetAudience}
            - Speak DIRECTLY to this audience using the voice of the Authority.
            - The ENTIRE CAROUSEL content must be tailored to solve ${targetAudience}'s problems.
            
            RETENTION ENGINEERING (CRITICAL):
            1. **Suspense Linking**: Each slide (except the last) MUST end with a "Cliffhanger" or an open loop that forces the user to swipe.
               - Example: "But the real danger was hidden..." (Swipe) "In his pocket."
               - NEVER resolve the thought on the same slide if it can be split.
            2. **Visual Brevity**: Keep text per slide UNDER 15 words.
            3. **Slide Count**: Target 6-8 slides exactly.
            
            CTA ENGINEERING (FINAL SLIDE):
            The LAST slide MUST be a Call To Action offering this LEAD MAGNET: "${leadMagnet}".
            - Do not be generic.
            - Provide a specific instruction (e.g., "Comment 'GUIDE' to get my ${leadMagnet}", "Check link in bio for...").
            
            DEEP LEARNING INSTRUCTION:
            ${descriptionStyleContext}
            
            - If the learning data shows short descriptions, be short. If long storytelling, do that.
            - IMPORTANT: DO NOT include ANY hashtags in the generated description. Hashtags will be added programmatically.
            - Adopt the exact tone found in the examples.
            - FORBIDDEN: Do NOT use the arrow character '→'. Use "->" or simply words.
            
            OUTPUT FORMAT:
            Return ONLY a JSON object with this structure:
            {
                "slides": [
                    {
                        "slide_number": 1,
                        "text": "Text to display on slide",
                        "intention": "Why this slide is here (e.g., 'Cliffhanger', 'Value Payoff', 'CTA')"
                    },
                    ...
                ],
                "description": "The generated description text..."
            }
            `,
            messages: [{ role: "user", content: `Hook: "${hook}". Generate an optimal viral carousel (6-8 slides) AND a matching description.` }]
        });
        const text = (msg.content[0] as any).text;
        const result = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
        slides = result.slides;

        // Append default hashtags if defined
        let aiDescription = result.description || "";

        // Debugging: Check why hashtags might be missing
        if (defaultHashtags && defaultHashtags.trim() !== '') {
            aiDescription += `\n\n${defaultHashtags}`;
        } else {
            // Temporary Debug Message to help User/Dev identify the issue
            aiDescription += `\n\n[DEBUG: Pas de hashtags trouvés. ProfileID: ${activeProfileId}, HashtagsLength: ${defaultHashtags?.length}, Value: "${defaultHashtags}"]`;
        }
        description = aiDescription;

    } catch (e: any) {
        return { error: `Erreur API: ${e.message}` };
    }

    // ... (image matching logic remains same)

    // ... (inside image matching logic)
    // 2. Fetch Candidate Images
    // Logic: exclude images utilized in last 15 posts (strict diversity)
    const lastPosts = await prisma.post.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
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
        return { slides, description, warning: "Pas assez d'images disponibles (filtre anti-répétition activé)." };
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

        const msg = await client.messages.create({
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

    return { slides, description };
}

export async function saveCarousel(hook: string, slides: Slide[], description: string, status: 'created' | 'draft' = 'created') {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const activeProfileId = await getActiveProfileId(session.user.id);
        if (!activeProfileId) return { error: 'No active profile found. Please select a profile first.' };

        // [NEW] 1. Check for Duplicate Hook
        const existingPost = await prisma.post.findFirst({
            where: {
                userId: session.user.id,
                hookText: hook
            }
        });

        if (existingPost) {
            return { error: 'Duplicate post detected: A post with this hook already exists.' };
        }

        // [NEW] 2. Check for Duplicate Images in Slides
        const imageIds = new Set<string>();
        for (const slide of slides) {
            if (slide.image_id) {
                if (imageIds.has(slide.image_id)) {
                    return { error: 'Duplicate image detected within the post. Each slide must have a unique image.' };
                }
                imageIds.add(slide.image_id);
            }
        }

        await prisma.post.create({
            data: {
                userId: session.user.id,
                profileId: activeProfileId, // [NEW] Link to active profile
                platform: 'tiktok', // default for generated
                hookText: hook,
                description: description,
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

export async function updatePostContent(postId: string, slides: Slide[], description: string, status?: 'draft' | 'created') {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.update({
            where: { id: postId, userId: session.user.id },
            data: {
                slides: JSON.stringify(slides),
                slideCount: slides.length,
                description: description,
                ...(status && { status }),
                updatedAt: new Date()
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to update post content' };
    }
}

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.delete({
            where: {
                id: postId,
                userId: session.user.id // Ensure ownership
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete post' };
    }
}
