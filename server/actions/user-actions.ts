'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateUserApiKey(apiKey: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { anthropicApiKey: apiKey }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error("Failed to update API key:", e);
        return { error: 'Failed to update API key' };
    }
}

export async function getUserApiKey() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true }
        });

        return { success: true, apiKey: user?.anthropicApiKey };
    } catch (e) {
        return { error: 'Failed to fetch API key' };
    }
}
