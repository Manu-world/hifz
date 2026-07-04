# Build Prompt: Arabic Vocabulary Memorization PWA

---

## Role & Objective

You are a senior full-stack engineer. Build a **Progressive Web App (PWA)** for personal Arabic vocabulary memorization, using **Next.js (App Router, TypeScript)**. The app lets me paste vocabulary lists (CSV format), organizes them into categories, and drills me on them through three modes — plain recall, reverse recall, and a gamified mode — using a spaced-repetition engine so practice time is spent on the words I actually struggle with.

Suggested name: **"Hifz"** (from حفظ, "memorization") — feel free to keep or change it.

---

## 1. Tech Stack

- **Next.js 14+**, App Router, TypeScript, Tailwind CSS
- **Database:** Prisma ORM with **SQLite** as the default local provider (`file:./dev.db`) — no hosted DB needed for local use. Structure the data layer (repository/service functions, not raw Prisma calls scattered in components) so it can be swapped to **MongoDB** later just by changing the Prisma datasource and connection string.
  - ⚠️ Note in the README: plain SQLite files don't persist on serverless hosts like Vercel (ephemeral filesystem). If deploying online rather than running locally/self-hosted, use **Turso/libSQL** (SQLite-compatible, has a free hosted tier) or fall back to the MongoDB URL.
- **PWA:** installable manifest, service worker for offline asset caching, and **IndexedDB** as a local cache so practice sessions still work offline, syncing progress back to the server when the connection returns.
- No auth needed — single-user, personal app.

---

## 2. Data Model

```
Category
  id, name, createdAt

VocabWord
  id, categoryId
  arabic          // may contain "/" separated synonyms, e.g. "يجيء / ياتي"
  english         // may contain "/" separated synonyms, e.g. "To stand / rise"
  exampleArabic   // nullable — not every word has one
  exampleEnglish  // nullable
  createdAt

WordProgress   (1:1 with VocabWord)
  id, wordId
  box            // spaced-repetition interval level, int, starts at 0
  dueAt          // datetime — when this word should next appear
  correctCount, wrongCount
  isDone         // manual "I know this" flag — excluded from normal rotation
  lastSeenAt

SessionLog        // for the dashboard
  id, mode ("recall" | "reverse" | "gamified"), categoryId, startedAt,
  wordsShown, correctCount, xpEarned

GamificationProfile
  id, xp, level, currentStreak, longestStreak, lastPracticedDate, achievements[]
```

Keep `exampleArabic`/`exampleEnglish` nullable and have the UI simply skip the example block when absent.

---

## 3. Importing Vocabulary (CSV Paste)

- A text area where I paste CSV. Expected header (case-insensitive, order-flexible):
  `Arabic Verb, English Meaning, Arabic Example, English Example`
- Example rows for reference:
  ```
  يذهب,To go,انا اذهب الى السوق,I go to the market
  يجيء / ياتي,To come,هو يجيء كل يوم,He comes every day
  ```
- Parse leniently: allow missing example columns (empty string → treated as null), trim whitespace, ignore extra blank rows.
- After parsing, show a **preview table** before committing.
- Ask me to either:
  1. **Create a new category** (I name it), or
  2. **Add to an existing category** (dropdown of existing categories)
- On add-to-existing, detect duplicates by exact `arabic` field match and skip/flag them rather than creating duplicates.

---

## 4. Answer Matching Logic (applies to both recall modes)

Write a shared `normalizeAndMatch()` utility:

- **English side:** lowercase, trim, strip a leading `"to "` from both the stored answer and my input (so "go" and "to go" both count), split the stored field on `/` or `,` into synonym options, accept a match against **any** option.
- **Arabic side:** normalize before comparing —
  - strip diacritics/tashkeel (Unicode range `\u064B-\u0652`)
  - normalize alef forms (أ, إ, آ → ا)
  - normalize ta marbuta/ha (ة ↔ ه) as equivalent
  - split stored field on `/` and accept any synonym match
- Comparison is always **case-insensitive** (English) and diacritic-insensitive (Arabic).
- On submit, always show: ✅/❌, the correct answer, **and** the example sentence (Arabic + English) if one exists — regardless of whether I got it right. This is intentional: repeated exposure to the word in context is part of the memorization method, not just feedback.

---

## 5. Spaced Repetition (the engine behind word selection)

Don't just show words randomly — use a simple **Leitner-box scheduler** shared by all three modes:

- Every word starts in box 0 (`dueAt` = now).
- Correct answer → move up a box, push `dueAt` further out (e.g. box intervals: same-day, 1 day, 3 days, 7 days, 16 days, 35 days).
- Wrong answer → drop back to box 0, `dueAt` = now (review again soon).
- Each session pulls words where `dueAt <= now`, prioritizing the most overdue first, from the current category (or across all categories in "Revise All" mode).
- `isDone = true` removes a word from this pool entirely, in **any** mode, until I explicitly choose "Revise All" mode, which ignores `isDone` and reviews everything.
- Manual "Mark as done" button is always available during a session (separate from getting an answer right — mastery is my call, not just the algorithm's).

This gives me the "mark as done" behavior I asked for, plus intelligent scheduling underneath so I'm not endlessly re-drilling words I already know.

---

## 6. Practice Modes

### 6.1 Recall Mode (Arabic → English)

Show the Arabic word. I type the English meaning. Check via the matcher above. Reveal answer + example.

### 6.2 Reverse Mode (English → Arabic)

Show the English meaning. I type the Arabic word. Same matching/reveal behavior, with Arabic-side normalization.

### 6.3 Gamified Mode

See section 7 — this pulls from the same due-word pool but presents it as a game rather than a flashcard.

### 6.4 Revise All

Same as recall/reverse, but ignores `isDone` and `dueAt` — pulls the full word set for a category (or everything) for a full review pass.

---

## 7. Gamified Mode — Design & Rationale

You (the AI) have latitude here, but ground it in what actually works for vocabulary retention rather than just adding points for their own sake. The mechanics that matter most for memorization are **active recall** (retrieving the answer, not recognizing it), **spaced repetition** (already handled above), **contextual exposure** (example sentences), and **short feedback loops**. Gamification should amplify those, not distract from them. Build the following:

**Core loop — rotate between 3 sub-games within a session** (keeps it from getting stale, and interleaving different question formats for the same words improves retention over drilling one format repeatedly):

1. **Word Rush** — Arabic word shown, 4 English options (1 correct + 3 distractors pulled from other words in the same category), timed. Fast correct answers score higher (speed bonus), building an audio-recognition-style reflex.
2. **Type Sprint** — same as Recall Mode but under a light timer, with a combo multiplier for consecutive correct answers. This keeps the _typing_ (real recall, not multiple choice) but adds pace and stakes.
3. **Sentence Weaver** — show the Arabic example sentence with the target word blanked out; I type or pick the missing word. Only usable for words that have an example sentence. This is the piece that trains me to recognize the word _in use_, not just in isolation.

**Progression/motivation layer:**

- **XP & Levels** — XP per correct answer, weighted higher for words in lower boxes (harder words are worth more, rewarding effort on genuinely weak spots instead of farming easy ones).
- **Daily streak** — tracks consecutive days practiced (any mode counts), shown prominently; this is the single strongest habit-formation lever, more effective for building a memorization habit than in-session scoring.
- **Category mastery bar** — % of words in `isDone` or high-box state per category, visualized like a progress bar/skill node.
- **Achievements** — a few lightweight badges (first 7-day streak, 50 words mastered, perfect Word Rush round, etc.) — low-effort to build, adds occasional variable reward.
- Skip hard "lives/hearts" penalty mechanics — this is a personal study tool, not a competitive game, so avoid punishing designs that could make me avoid opening the app on a bad day.

**Optional stretch feature worth including if time allows:** a listening variant using the browser's `speechSynthesis` API to read the Arabic word/example aloud — auditory exposure is a cheap addition that reinforces the same memorization goal.

---

## 8. Categories & Dashboard

- Home screen: list of categories, each showing word count, % mastered, and due-today count.
- Each category expandable into: Recall / Reverse / Gamified / Revise All / Word list (with manual done-toggle per word, and edit/delete).
- Dashboard tab: streak, total XP/level, a simple chart of words mastered over time, accuracy trend.
- Data export: a button to export all vocab + progress as JSON (personal backup, since this is my own study data).

---

## 9. Visual/UX Requirements

- Arabic text rendered right-to-left (`dir="rtl"`) in a clear Arabic web font (e.g., Noto Naskh Arabic or Cairo via Google Fonts); English UI stays LTR.
- Mobile-first layout (this will primarily be used on a phone) — large tap targets, minimal chrome during a session so it feels like a fast drill, not a form.
- Keep the practice screens distraction-free: word/prompt, input, submit, immediate feedback + example — nothing else competing for attention mid-session.

---

## 10. Build Order

1. Data model + Prisma/SQLite setup + CSV import with preview
2. Recall + Reverse modes with the matching/normalization logic and spaced-repetition scheduler
3. Category management, done-flagging, Revise All
4. Gamified mode (start with Word Rush + Type Sprint, add Sentence Weaver once example-sentence coverage is confirmed working)
5. Dashboard + streak/XP layer
6. PWA manifest + service worker + offline IndexedDB caching + sync
7. Polish pass: RTL/font handling, mobile layout, export/backup

If anything above is ambiguous, make a reasonable assumption, note it in the code comments/README, and keep going rather than stalling on it.
