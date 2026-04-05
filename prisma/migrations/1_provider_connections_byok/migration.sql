-- CreateTable
CREATE TABLE "provider_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_connections_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "agents" ADD COLUMN "providerConnectionId" UUID;

-- Indexes
CREATE INDEX "provider_connections_userId_idx" ON "provider_connections"("userId");
CREATE INDEX "provider_connections_userId_provider_idx" ON "provider_connections"("userId", "provider");
CREATE INDEX "provider_connections_userId_isActive_idx" ON "provider_connections"("userId", "isActive");
CREATE UNIQUE INDEX "provider_connections_id_userId_key" ON "provider_connections"("id", "userId");
CREATE INDEX "agents_providerConnectionId_idx" ON "agents"("providerConnectionId");

-- Foreign Keys
ALTER TABLE "provider_connections"
  ADD CONSTRAINT "provider_connections_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agents"
  ADD CONSTRAINT "agents_providerConnectionId_ownerId_fkey"
  FOREIGN KEY ("providerConnectionId", "ownerId")
  REFERENCES "provider_connections"("id", "userId")
  ON DELETE SET NULL ON UPDATE CASCADE;
