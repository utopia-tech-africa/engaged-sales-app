-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('daily', 'weekly');

-- CreateTable
CREATE TABLE "ReportConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "dailyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyCron" TEXT NOT NULL DEFAULT '0 0 19 * * *',
    "weeklyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weeklyCron" TEXT NOT NULL DEFAULT '0 0 19 * * 1',
    "dailyLastSentAt" TIMESTAMP(3),
    "weeklyLastSentAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRecipient" (
    "id" TEXT NOT NULL,
    "reportConfigId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "frequency" "ReportFrequency" NOT NULL DEFAULT 'daily',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportConfig_key_key" ON "ReportConfig"("key");

-- CreateIndex
CREATE INDEX "ReportRecipient_reportConfigId_idx" ON "ReportRecipient"("reportConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportRecipient_reportConfigId_email_frequency_key" ON "ReportRecipient"("reportConfigId", "email", "frequency");

-- AddForeignKey
ALTER TABLE "ReportConfig" ADD CONSTRAINT "ReportConfig_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRecipient" ADD CONSTRAINT "ReportRecipient_reportConfigId_fkey" FOREIGN KEY ("reportConfigId") REFERENCES "ReportConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
