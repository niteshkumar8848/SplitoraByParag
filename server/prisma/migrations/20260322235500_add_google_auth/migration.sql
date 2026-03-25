-- Add Google auth support while preserving existing local auth users.
ALTER TABLE "User"
ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "googleId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
