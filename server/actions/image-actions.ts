'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeImage, ImageAnalysisResult } from '@/lib/ai/claude';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

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
            const count = await prisma.image.count();
            const humanId = `IMG-${String(count + 1).padStart(5, '0')}`;

            await prisma.image.create({
                data: {
                    userId: session.user!.id,
                    humanId,
                    storageUrl: publicUrl,
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
