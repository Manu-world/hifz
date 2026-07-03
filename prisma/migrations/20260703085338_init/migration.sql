-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VocabWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "arabic" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "exampleArabic" TEXT,
    "exampleEnglish" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VocabWord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WordProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 0,
    "dueAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" DATETIME,
    "lastSeenAt" DATETIME,
    CONSTRAINT "WordProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabWord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "categoryId" TEXT,
    "isRevision" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "wordsShown" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SessionLog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GamificationProfile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedDate" DATETIME,
    "achievements" JSONB NOT NULL DEFAULT []
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "VocabWord_categoryId_idx" ON "VocabWord"("categoryId");

-- CreateIndex
CREATE INDEX "VocabWord_categoryId_arabic_idx" ON "VocabWord"("categoryId", "arabic");

-- CreateIndex
CREATE UNIQUE INDEX "WordProgress_wordId_key" ON "WordProgress"("wordId");

-- CreateIndex
CREATE INDEX "WordProgress_dueAt_idx" ON "WordProgress"("dueAt");

-- CreateIndex
CREATE INDEX "WordProgress_isDone_idx" ON "WordProgress"("isDone");

-- CreateIndex
CREATE INDEX "SessionLog_startedAt_idx" ON "SessionLog"("startedAt");

-- CreateIndex
CREATE INDEX "SessionLog_categoryId_idx" ON "SessionLog"("categoryId");
