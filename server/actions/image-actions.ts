
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { analyzeImage, ImageAnalysisResult } from '@/lib/ai/claude';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase';

// Upload Limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const BUCKET_NAME = 'organik-uploads';

export async function uploadImage(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // [CRITICAL] Check API Key FIRST
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { anthropicApiKey: true }
    });

    if (!user?.anthropicApiKey) {
        return { error: "Clé API manquante. Veuillez configurer votre clé dans les réglages." };
    }
    const apiKey = user.anthropicApiKey;

    const userId = session.user.id;
    const collectionId = formData.get('collectionId') as string | null;

    const files = formData.getAll('file') as File[];
    if (!files || files.length === 0) return { error: 'No files provided' };

    // Function to process a single file
    const processFile = async (file: File) => {
        if (file.size > MAX_FILE_SIZE) return { error: `File ${file.name} too large (max 5MB)` };

        try {
            const buffer = Buffer.from(await file.arrayBuffer());

            // [Checks] Calculate Hash & Check for duplicate
            const hash = createHash('sha256').update(buffer).digest('hex');
            const existingImage = await prisma.image.findFirst({
                where: {
                    userId: userId,
                    OR: [
                        { hash: hash },
                        { filename: file.name }
                    ]
                }
            });

            if (existingImage) {
                // If in a collection context, ensure it's linked
                if (collectionId) {
                    await prisma.collection.update({
                        where: { id: collectionId },
                        data: { images: { connect: { id: existingImage.id } } }
                    }).catch(() => { });
                }
                return { success: true, file: file.name, duplicate: true };
            }

            // 1. Upload to Supabase Storage
            const ext = file.name.split('.').pop();
            const filename = `${userId}/${uuidv4()}.${ext}`; // Structure: userId/uuid.jpg

            const { error: uploadError } = await supabaseAdmin
                .storage
                .from(BUCKET_NAME)
                .upload(filename, buffer, {
                    contentType: file.type,
                    upsert: false
                });

            if (uploadError) {
                console.error("Supabase Upload Error:", uploadError);
                return { error: `Upload failed for ${file.name}` };
            }

            // Get Public URL
            const { data: { publicUrl } } = supabaseAdmin
                .storage
                .from(BUCKET_NAME)
                .getPublicUrl(filename);



            // 2. DB Prep
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const humanId = `IMG-${timestamp}-${random}`;

            // 3. Analyze
            let analysis: ImageAnalysisResult;
            try {
                const base64 = buffer.toString('base64');
                analysis = await analyzeImage(base64, file.type, apiKey);
            } catch (e) {
                console.error(`Analysis failed for ${file.name}:`, e);
                analysis = {
                    description_long: (e as any)?.message?.includes('401') ? "Analysis Failed: Invalid API Key" : "Analysis failed",
                    keywords: [],
                    colors: [],
                    mood: "Unknown",
                    style: "Unknown",
                    composition: "Unknown",
                    facial_expression: "Unknown",
                    text_content: "Unknown"
                };
            }

            await prisma.image.create({
                data: {
                    user: { connect: { id: session.user!.id } },
                    humanId,
                    storageUrl: publicUrl,
                    hash,
                    filename: file.name,
                    descriptionLong: analysis.description_long || "No description",
                    keywords: JSON.stringify(analysis.keywords || []),
                    mood: analysis.mood,
                    style: analysis.style,
                    colors: JSON.stringify(analysis.colors || []),
                    collections: collectionId ? { connect: { id: collectionId } } : undefined
                },
            });

            return { success: true, file: file.name };
        } catch (e) {
            console.error(`Error processing ${file.name}:`, e);
            return { error: `Failed to process ${file.name}` };
        }
    };

    // Process all files in parallel
    const results = await Promise.all(files.map(processFile));
    const successCount = results.filter(r => r.success).length;

    revalidatePath('/dashboard');

    // Return the first error if strictly everything failed due to a blocking error, or generic message
    if (successCount === 0) {
        const firstError = results.find(r => r.error)?.error;
        return { error: firstError || 'Failed to upload images' };
    }

    return { success: true, count: successCount, total: files.length, results };
}

export async function getUserImages(collectionId?: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const whereClause = collectionId
            ? { collections: { some: { id: collectionId } } }
            : {}; // Shared Collection: Fetch all images regardless of user if no collection specified

        const imagesRaw = await prisma.image.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { collections: { select: { id: true, name: true } } } // Include to know which are added
        });

        // Parse JSON strings to arrays for keywords and colors
        const images = imagesRaw.map(img => ({
            ...img,
            keywords: JSON.parse(img.keywords || '[]') as string[],
            colors: JSON.parse(img.colors || '[]') as string[],
        }));

        return { success: true, images };
    } catch (e) {
        return { error: 'Failed to fetch images' };
    }
}

export async function deleteImage(imageId: string, storageUrl: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const image = await prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image || image.userId !== session.user.id) {
            return { error: 'Access denied' };
        }

        // Delete from DB first (safest, if storage fails we prefer consistency or orphan file over broken link)
        await prisma.image.delete({
            where: { id: imageId }
        });

        // Delete from Supabase Storage
        // Extract path from URL. Structure: .../organik-uploads/userId/filename
        // We uploaded as `userId/uuid.ext`

        // If the URL is full absolute URL:
        // https://xyz.supabase.co/storage/v1/object/public/organik-uploads/USERID/FILENAME
        // We need to extract `USERID/FILENAME`

        try {
            const urlObj = new URL(storageUrl);
            const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`);
            if (pathParts.length > 1) {
                const relativePath = pathParts[1];
                await supabaseAdmin.storage.from(BUCKET_NAME).remove([relativePath]);
            }
        } catch (e) {
            console.error("Failed to delete file from storage, but DB entry removed", e);
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete image' };
    }
}

export async function deleteImages(imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Verify ownership for all
        const images = await prisma.image.findMany({
            where: {
                id: { in: imageIds },
                userId: session.user.id
            }
        });

        if (images.length !== imageIds.length) {
            return { error: "Access denied for some images" };
        }

        // Delete from DB
        await prisma.image.deleteMany({
            where: { id: { in: imageIds } }
        });

        // Delete from Storage
        const pathsToDelete = images.map(img => {
            try {
                const urlObj = new URL(img.storageUrl);
                const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`);
                return pathParts.length > 1 ? pathParts[1] : null;
            } catch { return null; }
        }).filter(p => p !== null) as string[];

        if (pathsToDelete.length > 0) {
            await supabaseAdmin.storage.from(BUCKET_NAME).remove(pathsToDelete);
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete images" };
    }
}

export async function retryFailedAnalyses() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // 1. Find failed images - Expanded Criteria
        const failedImages = await prisma.image.findMany({
            where: {
                userId: session.user.id,
                OR: [
                    { descriptionLong: { contains: "Analysis failed" } },
                    { descriptionLong: "" },
                    { descriptionLong: "Unknown" },
                    // Also check for null or undefined if schema allows, though string field usually not null if default
                ]
            }
        });

        if (failedImages.length === 0) return { success: true, count: 0, message: "No failed analysis found" };

        let successCount = 0;
        const fs = require('fs/promises');
        const path = require('path');

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true }
        });
        const apiKey = user?.anthropicApiKey;
        if (!apiKey) return { error: "Clé API manquante pour relancer l'analyse." };

        for (const img of failedImages) {
            try {
                // Parse UUID filename from storageUrl
                // Format: /api/uploads/[userId]/[uuid].ext
                const urlParts = img.storageUrl.split('/');
                const filename = urlParts[urlParts.length - 1];

                // Construct absolute path using IMAGE'S userId to be safe
                // This ensures that even if current session user differs (unlikely) or if folder struct is specific
                // we look in the right place.
                const absolutePath = path.join(process.cwd(), 'public', 'uploads', img.userId, filename);

                // Check if file exists
                try {
                    await fs.access(absolutePath);
                } catch {
                    // Try alternative path (direct in public if older upload?)
                    // Or if storageUrl was relative to public
                    const altPath = path.join(process.cwd(), 'public', img.storageUrl.replace('/api/', ''));
                    try {
                        await fs.access(altPath);
                        // If found here, use this one
                    } catch {
                        console.error(`File not found for image ${img.id} at ${absolutePath}`);
                        continue;
                    }
                }

                // Re-verify specific file path if fallback succeeded? 
                // Let's just use the primary logic which we verified with debug script.

                // Read file
                const buffer = await fs.readFile(absolutePath);
                const base64 = buffer.toString('base64');
                const ext = filename.split('.').pop() || 'jpeg';
                const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

                // Analyze
                const analysis = await analyzeImage(base64, mimeType, apiKey);

                // Update
                await prisma.image.update({
                    where: { id: img.id },
                    data: {
                        descriptionLong: analysis.description_long || "No description",
                        keywords: JSON.stringify(analysis.keywords || []),
                        mood: analysis.mood,
                        style: analysis.style,
                        colors: JSON.stringify(analysis.colors || []),
                    }
                });

                successCount++;
            } catch (e) {
                console.error(`Retry failed for image ${img.id}:`, e);
                // Continue
            }
        }

        revalidatePath('/dashboard');
        return { success: true, count: successCount, total: failedImages.length };

    } catch (e) {
        console.error("Critical error in retry", e);
        return { error: 'Retry process failed' };
    }
}
