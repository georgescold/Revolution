'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import { addProfileToApify, removeProfileFromApify, runTikTokScraper } from '@/lib/apify';

const ProfileSchema = z.object({
    tiktokName: z.string().min(1, "Le nom TikTok est requis"),
    tiktokBio: z.string().optional(),
    persona: z.string().optional(),
    targetAudience: z.string().optional(),
    leadMagnet: z.string().optional(),
    hashtags: z.string().optional(),
});

// Helper to get active profile
export async function getActiveProfileId(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeProfileId: true, profiles: { select: { id: true }, take: 1 } }
    });
    return user?.activeProfileId || user?.profiles[0]?.id;
}

export async function switchProfile(profileId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    try {
        // Verify ownership
        const profile = await prisma.profile.findUnique({
            where: { id: profileId, userId: session.user.id }
        });

        if (!profile) return { error: 'Profile not found' };

        await prisma.user.update({
            where: { id: session.user.id },
            data: { activeProfileId: profileId }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to switch profile' };
    }
}

export async function createProfile(formData: z.infer<typeof ProfileSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const { tiktokName, tiktokBio, persona, targetAudience, leadMagnet, hashtags } = formData;

    try {
        const profile = await prisma.profile.create({
            data: {
                userId: session.user.id,
                tiktokName,
                bio: tiktokBio,
                persona,
                targetAudience,
                leadMagnet,
                hashtags,
            },
        });

        // Set as active if it's the first one or requested? 
        // Let's set as active automatically for better UX
        await prisma.user.update({
            where: { id: session.user.id },
            data: { activeProfileId: profile.id }
        });

        revalidatePath('/dashboard');

        // Sync with Apify
        if (tiktokName) {
            // Fire and forget catch, scrape ONLY this new profile immediately
            addProfileToApify(tiktokName)
                .then(() => runTikTokScraper([tiktokName], false))
                .catch(e => console.error("Apify sync (create) failed:", e));
        }

        return { success: true, profileId: profile.id };
    } catch (error) {
        return { error: 'Failed to create profile' };
    }
}

// Helper to save file securely
async function saveAvatar(file: File): Promise<string | null> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.writeFile(filePath, buffer);
        return `/uploads/avatars/${fileName}`;
    } catch (e) {
        console.error('Error saving avatar:', e);
        return null;
    }
}

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const tiktokName = formData.get('tiktokName') as string;
    const tiktokBio = formData.get('tiktokBio') as string;
    const persona = formData.get('persona') as string;
    const targetAudience = formData.get('targetAudience') as string;
    const leadMagnet = formData.get('leadMagnet') as string;
    const hashtags = formData.get('hashtags') as string;
    const followersCountRaw = formData.get('followersCount');
    const followersCount = followersCountRaw ? parseInt(followersCountRaw as string) : undefined;
    const avatarFile = formData.get('avatar') as File | null;

    try {
        let avatarUrl: string | undefined;
        if (avatarFile && avatarFile.size > 0) {
            const savedUrl = await saveAvatar(avatarFile);
            if (savedUrl) avatarUrl = savedUrl;
        }

        const activeProfileId = await getActiveProfileId(session.user.id);
        if (!activeProfileId) return { error: 'No active profile' };

        // Get current profile to check if followers changed
        const currentProfile = await prisma.profile.findUnique({
            where: { id: activeProfileId }
        });

        if (!currentProfile) return { error: 'Profile not found' };

        // Update profile
        await prisma.profile.update({
            where: { id: activeProfileId },
            data: {
                tiktokName,
                bio: tiktokBio,
                persona,
                targetAudience,
                leadMagnet,
                hashtags,
                ...(followersCount !== undefined ? { followersCount } : {}),
                ...(avatarUrl ? { avatarUrl } : {}),
            },
        });

        // Snapshot if changed or new
        if (followersCount !== undefined && currentProfile.followersCount !== followersCount) {
            await prisma.followerSnapshot.create({
                data: {
                    userId: session.user.id,
                    profileId: activeProfileId,
                    count: followersCount
                }
            });
        }

        revalidatePath('/dashboard');

        // Sync with Apify if name changed
        if (currentProfile.tiktokName !== tiktokName) {
            const syncPromises = [];

            if (currentProfile.tiktokName) {
                syncPromises.push(removeProfileFromApify(currentProfile.tiktokName));
            }

            // Assuming tiktokName is always a string from formData (or empty string)
            if (tiktokName) {
                syncPromises.push(
                    addProfileToApify(tiktokName).then(() => runTikTokScraper([tiktokName], false))
                );
            }

            Promise.all(syncPromises).catch(e => console.error("Apify sync (update) failed:", e));
        }
        // If just other fields changed but name is same, maybe we don't need to re-run?
        // But user said "envoie automatiquement le profil à scraper".
        // Assuming "update profile" button click implies "scrape me now".
        // If name didn't change, we can still trigger a scrape? 
        // Let's stick to name change for list sync, but maybe trigger scrape anyway?
        // User request: "lorsqu'un utilisateur rentre un profil donc son Nom tiktok ... que ça envoie".
        // This implies setting the name is the trigger.
        // If I just update bio, I don't necessarily want to scrape.
        // I will stick to the name change logic for now.

        return { success: true };
    } catch (error: any) {
        console.error('Failed to update profile:', error);
        return { error: `Failed to update profile: ${error.message}` };
    }
}

export async function deleteProfile() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile to delete' };

    try {
        // Fetch profile to get name for Apify sync before deleting
        const profileToDelete = await prisma.profile.findUnique({
            where: { id: activeProfileId },
            select: { tiktokName: true }
        });

        // Count profiles to prevent deleting the last one (optional, but safer)
        const profileCount = await prisma.profile.count({
            where: { userId: session.user.id }
        });

        if (profileCount <= 1) {
            return { error: 'Impossible de supprimer votre dernier profil.' };
        }

        // Delete the active profile
        await prisma.profile.delete({
            where: { id: activeProfileId }
        });

        // Find another profile to make active
        const remainingProfile = await prisma.profile.findFirst({
            where: { userId: session.user.id }
        });

        if (remainingProfile) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { activeProfileId: remainingProfile.id }
            });
        } else {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { activeProfileId: null }
            });
        }

        revalidatePath('/dashboard');

        // Sync with Apify
        if (profileToDelete?.tiktokName) {
            removeProfileFromApify(profileToDelete.tiktokName).catch(e => console.error("Apify sync (delete) failed:", e));
        }

        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete profile' };
    }
}
