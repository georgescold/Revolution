-- ------------------------------------------------------------------
-- SCRIPT DE MIGRATION MANUELLE (MULTI-PROFILS)
-- Copiez tout ce contenu et exécutez-le dans l'éditeur SQL de Supabase.
-- ------------------------------------------------------------------

-- 1. Permettre plusieurs profils pour un même utilisateur
-- On supprime la contrainte d'unicité sur userId dans la table Profile
DROP INDEX IF EXISTS "Profile_userId_key";

-- 2. Ajouter la colonne activeProfileId à la table User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activeProfileId" TEXT;

-- 3. Ajouter la colonne profileId à la table Post et créer la relation
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "profileId" TEXT;

-- Pour éviter les erreurs si la contrainte existe déjà
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Post_profileId_fkey') THEN
        ALTER TABLE "Post"
        ADD CONSTRAINT "Post_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Ajouter la colonne profileId à la table FollowerSnapshot
ALTER TABLE "FollowerSnapshot" ADD COLUMN IF NOT EXISTS "profileId" TEXT;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FollowerSnapshot_profileId_fkey') THEN
        ALTER TABLE "FollowerSnapshot"
        ADD CONSTRAINT "FollowerSnapshot_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------------------
-- 5. MIGRATION DES DONNÉES (Pour ne pas perdre l'existant)
-- ------------------------------------------------------------------

-- A. Lier les POsts existants au profil existant de l'utilisateur
UPDATE "Post"
SET "profileId" = (
  SELECT "id"
  FROM "Profile"
  WHERE "Profile"."userId" = "Post"."userId"
  ORDER BY "createdAt" ASC -- Prend le premier profil s'il y en a plusieurs (peu probable ici)
  LIMIT 1
)
WHERE "profileId" IS NULL;

-- B. Définir le profil actif pour les utilisateurs existants
UPDATE "User"
SET "activeProfileId" = (
  SELECT "id"
  FROM "Profile"
  WHERE "Profile"."userId" = "User"."id"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "activeProfileId" IS NULL;

-- C. Lier les Snapshot existants
UPDATE "FollowerSnapshot"
SET "profileId" = (
  SELECT "id"
  FROM "Profile"
  WHERE "Profile"."userId" = "FollowerSnapshot"."userId"
  LIMIT 1
)
WHERE "profileId" IS NULL;
