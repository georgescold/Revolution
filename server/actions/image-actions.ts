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

    const file = formData.get('file') as File;
    if (!file) return { error: 'No file provided' };

    if (file.size > 5 * 1024 * 1024) return { error: 'File too large (max 5MB)' }; // Simulating limit

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Save File Locally
    const relativeUploadDir = `/uploads/${session.user.id}`;
    const uploadDir = join(process.cwd(), 'public', relativeUploadDir);

    try {
        await mkdir(uploadDir, { recursive: true });
    } catch (e) {
        // ignore if exists
    }

    const ext = file.name.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const filepath = join(uploadDir, filename);
    const publicUrl = `${relativeUploadDir}/${filename}`;

    try {
        await writeFile(filepath, buffer);
    } catch (e) {
        return { error: 'Failed to save file' };
    }

    // 2. Analyze with Claude
    let analysis: ImageAnalysisResult;
    try {
        const base64 = buffer.toString('base64');
        analysis = await analyzeImage(base64, file.type);
    } catch (e) {
        console.error(e);
        // Fallback if AI fails? Or return error?
        // Let's create the image but with empty analysis or fail. 
        // Prompt says "Obligatoirement générer une description".
        return { error: 'AI Analysis Failed. Please try again.' };
    }

    // 3. Save to DB
    try {
        // Generate readable ID IMG-XXXX
        const count = await prisma.image.count();
        const humanId = `IMG-${String(count + 1).padStart(5, '0')}`;

        await prisma.image.create({
            data: {
                userId: session.user.id,
                humanId,
                storageUrl: publicUrl,
                descriptionLong: analysis.description_long || "No description",
                keywords: JSON.stringify(analysis.keywords || []),
                mood: analysis.mood,
                style: analysis.style,
                colors: JSON.stringify(analysis.colors || []),
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Database Error' };
    }
}

export async function getUserImages() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const images = await prisma.image.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                humanId: true,
                descriptionLong: true,
                storageUrl: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, images };
    } catch (e) {
        return { error: 'Failed to fetch images' };
    }
}
