-- CreateTable
CREATE TABLE "GeneratedTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userStory" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "exportPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ValidationIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warn',
    CONSTRAINT "ValidationIssue_testId_fkey" FOREIGN KEY ("testId") REFERENCES "GeneratedTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportLog_testId_fkey" FOREIGN KEY ("testId") REFERENCES "GeneratedTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ValidationIssue_testId_idx" ON "ValidationIssue"("testId");

-- CreateIndex
CREATE INDEX "ExportLog_testId_idx" ON "ExportLog"("testId");
