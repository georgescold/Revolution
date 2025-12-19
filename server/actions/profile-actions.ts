'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const ProfileSchema = z.object({
    tiktokName: z.string().min(1),
    tiktokBio: z.string().optional(),
    persona: z.string().optional(),
    contentGoal: z.string().optional(),
    // avatarUrl: z.string().optional(), // TODO: add file upload later
});

export async function createProfile(formData: z.infer<typeof ProfileSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const { tiktokName, tiktokBio, persona, contentGoal } = formData;

    try {
        await prisma.profile.create({
            data: {
                userId: session.user.id,
                tiktokName,
                bio: tiktokBio,
                persona,
                contentGoal,
            },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to create profile' };
    }
}
