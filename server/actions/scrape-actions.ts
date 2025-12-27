
'use server';

import { prisma } from "@/lib/prisma";
import { runTikTokScraper, fetchTikTokDataset } from "@/lib/apify";
import { revalidatePath } from "next/cache";
import stringSimilarity from 'string-similarity';

// Define types for Apify output
interface TikTokProfile {
    authorMeta: {
        name: string;
        fans: number;
        avatar: string;
        signature: string;
    };
    text: string;
    playCount: number;
    diggCount: number;
    shareCount: number;
    commentCount: number;
    collectCount: number;
    createTime?: number; // Unix timestamp in seconds
    createTimeISO?: string;
}

export async function scrapeAndSyncTikTokData() {


    try {
        // [STEP 0] Cleanup scraped-only posts
        // Ensures only manual/verified posts remain
        await prisma.post.deleteMany({ where: { origin: "scraped" } });

        // 1. Run & Fetch
        const datasetId = await runTikTokScraper();
        const items = (await fetchTikTokDataset(datasetId)) as unknown as TikTokProfile[];

        if (!items || items.length === 0) {
            return { success: false, error: "No items returned." };
        }

        // 2. Profile Update
        // Find the first item that contains author metadata
        const validItem = items.find(item => item.authorMeta && item.authorMeta.name);

        if (!validItem) {
            console.error("Scraper returned items but no authorMeta found:", items[0]);
            return { success: false, error: "Scraped data is missing profile information." };
        }

        const profileData = validItem.authorMeta;
        const user = await prisma.user.findFirst();
        if (!user) throw new Error("No user found.");

        const profile = await prisma.profile.upsert({
            where: { id: user.activeProfileId || "placeholder" },
            update: {
                // followersCount: profileData.fans, // DISABLED: User wants manual control only
                tiktokName: profileData.name,
                avatarUrl: profileData.avatar,
            },
            create: {
                userId: user.id,
                tiktokName: profileData.name,
                followersCount: profileData.fans,
                avatarUrl: profileData.avatar,
            }
        });

        // 3. Process Videos
        let updatedPosts = 0;
        const candidatePosts = await prisma.post.findMany({
            where: {
                profileId: profile.id,
                origin: { not: "scraped" }
            }
        });



        for (const item of items) {
            const scrapedText = (item.text || "").toLowerCase();
            const tiktokDate = item.createTime ? new Date(item.createTime * 1000) : null;

            let matchedPost = null;
            let matchReason = "";

            // --- STRATEGY A: RECENT POSTS (Date Window + Content Verification) ---
            if (tiktokDate) {
                const recentCandidates = candidatePosts.filter(p => {
                    const dbDate = new Date(p.createdAt);
                    const diffHours = Math.abs(tiktokDate.getTime() - dbDate.getTime()) / (1000 * 60 * 60);
                    return diffHours < 48; // 48h Window
                });

                if (recentCandidates.length > 0) {
                    let bestScore = 0;
                    let bestCand = null;

                    for (const cand of recentCandidates) {
                        const dbDesc = (cand.description || "").toLowerCase();

                        // 1. Strict Description Inclusion (The user-defined key)
                        if (dbDesc.length > 5 && scrapedText.includes(dbDesc)) {
                            bestScore = 1.0;
                            bestCand = cand;
                            break; // Found perfect match
                        }

                        // 2. Similarity on Description
                        const score = dbDesc ? stringSimilarity.compareTwoStrings(scrapedText, dbDesc) : 0;

                        if (score > bestScore) {
                            bestScore = score;
                            bestCand = cand;
                        }
                    }

                    // STRICT VERIFICATION: Matches based on Description ONLY
                    if (bestCand && bestScore > 0.6) {
                        matchedPost = bestCand;
                        matchReason = `Date + verified Description (Score ${bestScore.toFixed(2)})`;
                    }
                }
            }

            // --- STRATEGY B: OLD/BACKFILLED POSTS (Fallback) ---
            // Fallback for posts with shifted dates.
            // Requirement: Strict Description match.
            if (!matchedPost) {
                for (const post of candidatePosts) {
                    const dbDesc = (post.description || "").toLowerCase();

                    // Ignore empty descriptions (User must fill them to match)
                    if (dbDesc.length < 5) continue;

                    // Check Strict Inclusion of Description
                    if (scrapedText.includes(dbDesc)) {
                        matchedPost = post;
                        matchReason = "Strict Description Match (Old Post)";
                        break;
                    }
                }
            }

            if (matchedPost) {
                await prisma.metrics.upsert({
                    where: { postId: matchedPost.id },
                    update: {
                        views: item.playCount,
                        likes: item.diggCount,
                        shares: item.shareCount,
                        comments: item.commentCount,
                        saves: item.collectCount || 0
                    },
                    create: {
                        postId: matchedPost.id,
                        views: item.playCount,
                        likes: item.diggCount,
                        shares: item.shareCount,
                        comments: item.commentCount,
                        saves: item.collectCount || 0
                    }
                });
                updatedPosts++;
            }
        }

        await prisma.analyticsSnapshot.create({
            data: {
                profileId: profile.id,
                metric: "followers",
                value: profile.followersCount || 0, // [UPDATED] Use manual DB value, not scraped value
                date: new Date()
            }
        });

        revalidatePath("/dashboard");
        return { success: true, newPosts: 0, updatedPosts };

    } catch (error: any) {
        console.error("Scrape sync failed:", error);
        return { success: false, error: error.message };
    }
}
