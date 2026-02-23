-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKeyEncrypted" TEXT,
    "authType" TEXT NOT NULL,
    "customAuthHeader" TEXT,
    "capabilities" TEXT[],
    "costTier" TEXT NOT NULL,
    "qualityTier" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "contextWindow" INTEGER,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsTools" BOOLEAN NOT NULL DEFAULT false,
    "defaultParams" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_mappings" (
    "id" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "matchMode" TEXT NOT NULL,
    "requiredTags" TEXT[],
    "excludedTags" TEXT[],
    "specificModelId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "fallbackMode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_templates" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "defaultBaseUrl" TEXT,
    "defaultCapabilities" TEXT[],
    "defaultAuthType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "helpUrl" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "provider_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "providers_providerType_idx" ON "providers"("providerType");

-- CreateIndex
CREATE INDEX "providers_isEnabled_idx" ON "providers"("isEnabled");

-- CreateIndex
CREATE INDEX "providers_isValidated_idx" ON "providers"("isValidated");

-- CreateIndex
CREATE INDEX "models_providerId_idx" ON "models"("providerId");

-- CreateIndex
CREATE INDEX "models_supportsVision_idx" ON "models"("supportsVision");

-- CreateIndex
CREATE INDEX "models_supportsTools_idx" ON "models"("supportsTools");

-- CreateIndex
CREATE UNIQUE INDEX "models_providerId_modelId_key" ON "models"("providerId", "modelId");

-- CreateIndex
CREATE INDEX "feature_mappings_featureType_idx" ON "feature_mappings"("featureType");

-- CreateIndex
CREATE INDEX "feature_mappings_matchMode_idx" ON "feature_mappings"("matchMode");

-- CreateIndex
CREATE INDEX "feature_mappings_specificModelId_idx" ON "feature_mappings"("specificModelId");

-- CreateIndex
CREATE INDEX "feature_mappings_priority_idx" ON "feature_mappings"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "provider_templates_templateId_key" ON "provider_templates"("templateId");

-- CreateIndex
CREATE INDEX "provider_templates_isPopular_idx" ON "provider_templates"("isPopular");

-- CreateIndex
CREATE INDEX "provider_templates_sortOrder_idx" ON "provider_templates"("sortOrder");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_mappings" ADD CONSTRAINT "feature_mappings_specificModelId_fkey" FOREIGN KEY ("specificModelId") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
