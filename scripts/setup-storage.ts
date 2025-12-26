// scripts/setup-storage.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const bucketName = 'organik-uploads';
    console.log(`Configuring Supabase Storage Bucket: ${bucketName}...`);

    try {
        // 1. Create Bucket if not exists
        await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('${bucketName}', '${bucketName}', true)
      ON CONFLICT (id) DO NOTHING;
    `);
        console.log("Bucket created (or already exists).");

        // 2. Create Public Access Policy
        // Note: 'storage.objects' is the table.
        // We use a DO block to avoid error if policy exists, or simple DROP/CREATE
        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Public Access" ON storage.objects;`);

        await prisma.$executeRawUnsafe(`
      CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = '${bucketName}');
    `);
        console.log("Public Access Policy configured.");

        // Note: We don't strictly need an INSERT policy if we only upload via Service Role Key (Admin Client),
        // because Service Role bypasses RLS.
        // But if we wanted client-side upload later, we would add one.

        console.log("Setup complete! Your storage is ready.");
    } catch (e) {
        console.error("Error setting up storage:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
