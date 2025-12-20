'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeImage, ImageAnalysisResult } from '@/lib/ai/claude';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

export async function uploadImage(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const files = formData.getAll('file') as File[];
    if (!files || files.length === 0) return { error: 'No files provided' };

    // Function to process a single file
    const processFile = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) return { error: `File ${file.name} too large (max 5MB)` };

        try {
            const buffer = Buffer.from(await file.arrayBuffer());

            // [NEW] Calculate Hash
            const hash = createHash('sha256').update(buffer).digest('hex');

            // [NEW] Check for duplicate
            const existingImage = await prisma.image.findFirst({
                where: {
                    userId: session.user.id,
                    hash: hash
                }
            });

            if (existingImage) {
                return { success: true, file: file.name, duplicate: true };
            }

            // 1. Save File Locally
            const relativeUploadDir = `/uploads/${session.user!.id}`;
            const uploadDir = join(process.cwd(), 'public', relativeUploadDir);

            try {
                await mkdir(uploadDir, { recursive: true });
            } catch (e) {
                // ignore
            }

            const ext = file.name.split('.').pop();
            const filename = `${uuidv4()}.${ext}`;
            const filepath = join(uploadDir, filename);
            const publicUrl = `${relativeUploadDir}/${filename}`;

            await writeFile(filepath, buffer);

            // 2. Analyze with Claude
            let analysis: ImageAnalysisResult;
            try {
                const base64 = buffer.toString('base64');
                analysis = await analyzeImage(base64, file.type);
            } catch (e) {
                console.error(`Analysis failed for ${file.name}:`, e);
                // Fallback to basic info
                analysis = {
                    description_long: "Analysis failed",
                    keywords: [],
                    colors: [],
                    mood: "Unknown",
                    style: "Unknown",
                    composition: "Unknown",
                    facial_expression: "Unknown",
                    text_content: "Unknown"
                };
            }

            // 3. Save to DB
            // Use Timestamp + Random suffix to ensure uniqueness in parallel
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const humanId = `IMG-${timestamp}-${random}`;

            await prisma.image.create({
                data: {
                    user: { connect: { id: session.user!.id } },
                    humanId,
                    storageUrl: publicUrl,
                    hash, // [NEW] Save hash
                    descriptionLong: analysis.description_long || "No description",
                    keywords: JSON.stringify(analysis.keywords || []),
                    mood: analysis.mood,
                    style: analysis.style,
                    colors: JSON.stringify(analysis.colors || []),
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

    // Check if at least one succeeded
    const successCount = results.filter(r => r.success).length;

    revalidatePath('/dashboard');

    if (successCount === 0) {
        return { error: 'Failed to upload images' };
    }

    return { success: true, count: successCount, total: files.length, results };
}

export async function getUserImages() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const imagesRaw = await prisma.image.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
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
        // 1. Verify ownership
        const image = await prisma.image.findUnique({
            where: { id: imageId },
        });

        if (!image || image.userId !== session.user.id) {
            return { error: 'Image not found or unauthorized' };
        }

        // 2. Delete from DB
        await prisma.image.delete({
            where: { id: imageId },
        });

        // 3. Delete file if possible (ignore error if missing)
        try {
            const fs = require('fs/promises');
            const path = require('path');
            // storageUrl is like "/uploads/userid/filename.jpg"
            // We need absolute path: process.cwd() + /public + storageUrl
            const absolutePath = path.join(process.cwd(), 'public', storageUrl);
            await fs.unlink(absolutePath);
        } catch (e) {
            console.error('Failed to delete file from disk (might be missing):', e);
            // Non-blocking error
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error('Delete error:', e);
        return { error: 'Failed to delete image' };
    }
}

export async function deleteImages(imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // 1. Verify ownership (count matching user images)
        const count = await prisma.image.count({
            where: {
                id: { in: imageIds },
                userId: session.user.id
            }
        });

        if (count !== imageIds.length) {
            return { error: 'Unauthorized or images not found' };
        }

        // 2. Fetch storage URLs before delete to cleanup files
        const images = await prisma.image.findMany({
            where: { id: { in: imageIds } },
            select: { storageUrl: true }
        });

        // 3. Delete from DB
        await prisma.image.deleteMany({
            where: { id: { in: imageIds } }
        });

        // 4. Delete files (best effort)
        const fs = require('fs/promises');
        const path = require('path');

        await Promise.all(images.map(async (img) => {
            try {
                const absolutePath = path.join(process.cwd(), 'public', img.storageUrl);
                await fs.unlink(absolutePath);
            } catch {
                // Ignore missing files
            }
        }));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error('Bulk delete error:', e);
        return { error: 'Failed to delete images' };
    }
}
