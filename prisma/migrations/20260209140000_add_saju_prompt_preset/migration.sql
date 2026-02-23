-- CreateTable
CREATE TABLE "SajuPromptPreset" (
    "id" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "levels" TEXT NOT NULL DEFAULT '★★★☆☆',
    "purpose" TEXT NOT NULL,
    "recommendedTiming" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "promptTemplate" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SajuPromptPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SajuPromptPreset_promptKey_key" ON "SajuPromptPreset"("promptKey");

-- CreateIndex
CREATE INDEX "SajuPromptPreset_isActive_idx" ON "SajuPromptPreset"("isActive");

-- CreateIndex
CREATE INDEX "SajuPromptPreset_sortOrder_idx" ON "SajuPromptPreset"("sortOrder");
