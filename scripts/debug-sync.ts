
import { PrismaClient } from '@prisma/client'
import { ApifyClient } from 'apify-client';
import stringSimilarity from 'string-similarity';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

async function main() {
    console.log("DEBUG: Forensic Match Analysis...");

    // 1. Get recent posts
    const recentPosts = await prisma.post.findMany({
        where: {
            createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        }
    });

    console.log(`Found ${recentPosts.length} recent posts (last 3 days):`);
    recentPosts.forEach(p => {
        console.log(`ID: ${p.id} | Date: ${p.createdAt.toISOString()}`);
        console.log(`Title: ${p.title?.substring(0, 50)}...`);
        console.log(`Hook: ${p.hookText?.substring(0, 50)}...`);
        console.log("---");
    });

    // Attempt to pick the one that looks like "mental"
    const dbPost = recentPosts.find(p => p.hookText?.toLowerCase().includes("mental") || p.title?.toLowerCase().includes("mental"));

    if (!dbPost) {
        console.error("❌ DB Post 'Hack Mental' still not found among recent.");
        return;
    }

    console.log(`\nDB Post Found:`);
    console.log(`- ID: ${dbPost.id}`);
    console.log(`- CreatedAt: ${dbPost.createdAt.toISOString()}`);
    console.log(`- Hook: "${dbPost.hookText}"`);
    console.log(`- Title: "${dbPost.title}"`);

    // 2. Fetch Apify Data (Last Run)
    console.log("\nFetching Apify Data...");
    const run = await apifyClient.task(process.env.APIFY_TASK_ID!).call();
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    // 3. Find the conflicting TikTok Video (from Dec 21st, matching the date)
    // We assume it's the one with "Commente guide"
    const relevantItems = items.filter((i: any) => {
        if (!i.createTime) return false;
        const vidDate = new Date(i.createTime * 1000);
        // Check roughly same day (Dec 21 approx)
        return vidDate.toISOString().includes("2025-12-21");
    });

    console.log(`\nFound ${relevantItems.length} TikTok videos from same day (approx):`);

    for (const item of (relevantItems as any[])) {
        console.log(`\n--- Comparison with Video ID ${item.id} ---`);
        console.log(`Video Text: "${item.text}"`);
        console.log(`Video Date: ${new Date(item.createTime! * 1000).toISOString()}`);

        const scrapedText = (item.text || "").toLowerCase();
        const dbTitle = (dbPost.title || "").toLowerCase();
        const dbHook = (dbPost.hookText || "").toLowerCase();

        // RUN THE EXACT LOGIC

        // 1. Inclusion
        const titleInc = dbTitle.length > 5 && scrapedText.includes(dbTitle);
        const hookInc = dbHook.length > 5 && scrapedText.includes(dbHook.substring(0, 30));

        // 2. Similarity
        const scoreT = dbTitle ? stringSimilarity.compareTwoStrings(scrapedText, dbTitle) : 0;
        const scoreH = dbHook ? stringSimilarity.compareTwoStrings(scrapedText, dbHook) : 0;
        const maxScore = Math.max(scoreT, scoreH);

        console.log(`SCORES:`);
        console.log(`- Inclusion Title: ${titleInc}`);
        console.log(`- Inclusion Hook (first 30): ${hookInc}`);
        console.log(`- Similarity Title: ${scoreT.toFixed(4)}`);
        console.log(`- Similarity Hook: ${scoreH.toFixed(4)}`);
        console.log(`- MAX SCORE: ${maxScore.toFixed(4)}`);

        const WOULD_MATCH = (titleInc || hookInc) || (maxScore > 0.3); // Current Threshold
        console.log(`RESULT (Threshold 0.3): ${WOULD_MATCH ? "MATCH ✅ (BAD!)" : "NO MATCH ❌ (GOOD)"}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
