
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('Checking images in database...');

    // Get all images
    const images = await prisma.image.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${images.length} recent images.`);

    for (const img of images) {
        console.log(`\nID: ${img.id}`);
        console.log(`HumanID: ${img.humanId}`);
        console.log(`Description: ${img.descriptionLong}`);
        console.log(`StorageURL: ${img.storageUrl}`);

        // Try to reconstruct path
        const urlParts = img.storageUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const userId = img.userId;

        const possiblePaths = [
            path.join(process.cwd(), 'public', 'uploads', userId, filename),
            path.join(process.cwd(), 'public', img.storageUrl),
            path.join(process.cwd(), 'public', img.storageUrl.replace('/api/', '/'))
        ];

        let found = false;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                console.log(`✅ File found at: ${p}`);
                found = true;
                break;
            }
        }

        if (!found) {
            console.log(`❌ File NOT found. Checked:`);
            possiblePaths.forEach(p => console.log(`  - ${p}`));
        }

        if (img.descriptionLong === 'Analysis failed') {
            console.log('⚠️ THIS IMAGE NEEDS RE-ANALYSIS');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
