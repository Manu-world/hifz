"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizeAndMatch } from "@/lib/practice/matcher";
import {
  blankSentence,
  buildWordRushOptions,
  comboMultiplier,
  firstSynonym,
  pickSubGame,
  type SubGame,
} from "@/lib/practice/gamified";
import { ACHIEVEMENTS, type AchievementId } from "@/lib/practice/gamification";
import { SpeakButton } from "@/components/practice/speak-button";
import {
  createSession,
  endSession,
  fetchDueWords,
  submitAnswer,
  type SessionHandle,
} from "@/lib/offline/api";

type GamifiedWord = {
  id: string;
  arabic: string;
  english: string;
  exampleArabic: string | null;
  exampleEnglish: string | null;
};

type PoolWord = { id: string; arabic: string; english: string };

type Phase = "loading" | "empty" | "active" | "finished";

const TIME_LIMIT_MS: Partial<Record<SubGame, number>> = {
  wordRush: 8000,
  typeSprint: 10000,
};

const SUB_GAME_LABEL: Record<SubGame, string> = {
  wordRush: "Word Rush",
  typeSprint: "Type Sprint",
  sentenceWeaver: "Sentence Weaver",
};

/** Pure: converts elapsed time into a 0-1 "how much time was left" fraction for the XP speed bonus. */
function speedFractionFrom(game: SubGame, elapsedMs: number): number {
  const limit = TIME_LIMIT_MS[game];
  if (!limit) return 0;
  return Math.max(0, Math.min(1, (limit - elapsedMs) / limit));
}

/**
 * Self-contained countdown bar. Remounted (via `key`) whenever the active
 * question changes, so its own tick state always starts fresh from render
 * rather than being reset by an effect — ticking updates happen inside the
 * `setInterval` callback, not the effect body itself.
 */
function TimerBar({ limitMs, onTimeout }: { limitMs: number; onTimeout: () => void }) {
  const [timeLeftMs, setTimeLeftMs] = useState(limitMs);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const remaining = limitMs - (Date.now() - startedAt);
      if (remaining <= 0) {
        setTimeLeftMs(0);
        clearInterval(interval);
        onTimeoutRef.current();
      } else {
        setTimeLeftMs(remaining);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [limitMs]);

  return <Progress value={Math.round((timeLeftMs / limitMs) * 100)} className="h-1.5" />;
}

export function GamifiedSession({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<SessionHandle | null>(null);
  const [queue, setQueue] = useState<GamifiedWord[]>([]);
  const [pool, setPool] = useState<PoolWord[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [consumed, setConsumed] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctAnswer: string } | null>(
    null,
  );
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [tally, setTally] = useState({ wordsShown: 0, correctCount: 0, xpEarned: 0 });
  const [wordRushStats, setWordRushStats] = useState({ total: 0, correct: 0 });

  const tallyRef = useRef(tally);
  const wordRushStatsRef = useRef(wordRushStats);
  const answeredRef = useRef(false);
  const comboRef = useRef(combo);
  const questionStartedAtRef = useRef(0);

  const currentWord = queue[0] ?? null;

  const subGame: SubGame | null = currentWord
    ? pickSubGame(consumed, { hasExample: !!currentWord.exampleArabic, poolSize: pool.length })
    : null;

  const correctOptionText = useMemo(
    () => (currentWord ? firstSynonym(currentWord.english) : ""),
    [currentWord],
  );

  const wordRushOptions = useMemo(() => {
    if (subGame !== "wordRush" || !currentWord) return [];
    return buildWordRushOptions(
      currentWord.english,
      pool.filter((w) => w.id !== currentWord.id),
    );
  }, [currentWord, subGame, pool]);

  const sentenceWeaver = useMemo(() => {
    if (subGame !== "sentenceWeaver" || !currentWord?.exampleArabic) return null;
    return blankSentence(currentWord.exampleArabic, currentWord.arabic);
  }, [subGame, currentWord]);

  useEffect(() => {
    tallyRef.current = tally;
  }, [tally]);

  useEffect(() => {
    wordRushStatsRef.current = wordRushStats;
  }, [wordRushStats]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setPhase("loading");
      const { words, pool: fetchedPool } = await fetchDueWords<GamifiedWord, PoolWord>(categoryId, {
        revise: false,
        mode: "gamified",
      });
      if (cancelled) return;

      if (words.length === 0) {
        setPhase("empty");
        return;
      }

      const newSession = await createSession({ mode: "gamified", categoryId, isRevision: false });
      if (cancelled) return;

      setSession(newSession);
      setPool(fetchedPool);
      setQueue(words);
      setTotalWords(words.length);
      answeredRef.current = false;
      questionStartedAtRef.current = Date.now();
      setPhase("active");
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  async function handleAnswer(isCorrect: boolean, speedFraction: number) {
    if (!currentWord || !subGame || answeredRef.current) return;
    answeredRef.current = true;

    const correctAnswer =
      subGame === "wordRush"
        ? correctOptionText
        : subGame === "sentenceWeaver"
          ? currentWord.arabic
          : currentWord.english;
    setFeedback({ isCorrect, correctAnswer });

    const { xpEarned: baseXp } = await submitAnswer({
      wordId: currentWord.id,
      isCorrect,
      awardXp: true,
      speedFraction,
    });

    const nextCombo = isCorrect ? comboRef.current + 1 : 0;
    setCombo(nextCombo);
    setMaxCombo((prev) => Math.max(prev, nextCombo));

    // The combo multiplier is a session-ephemeral mechanic scoped to Type
    // Sprint (per PRD section 7.1's "combo multiplier for consecutive
    // correct answers"), applied client-side on top of the server's
    // box-weighted base XP.
    const multiplier = subGame === "typeSprint" ? comboMultiplier(nextCombo) : 1;
    const xpEarned = Math.round(baseXp * multiplier);

    setTally((prev) => {
      const next = {
        wordsShown: prev.wordsShown + 1,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
        xpEarned: prev.xpEarned + xpEarned,
      };
      tallyRef.current = next;
      return next;
    });

    if (subGame === "wordRush") {
      setWordRushStats((prev) => {
        const next = { total: prev.total + 1, correct: prev.correct + (isCorrect ? 1 : 0) };
        wordRushStatsRef.current = next;
        return next;
      });
    }
  }

  const progressPct = useMemo(() => {
    if (totalWords === 0) return 0;
    return Math.round(((totalWords - queue.length) / totalWords) * 100);
  }, [totalWords, queue.length]);

  async function finishSession() {
    const finalTally = tallyRef.current;
    const wordRushPerfectRound =
      wordRushStatsRef.current.total > 0 &&
      wordRushStatsRef.current.correct === wordRushStatsRef.current.total;

    if (session) {
      const { rewards } = await endSession(session, { ...finalTally, wordRushPerfectRound });
      for (const id of rewards?.newAchievements ?? []) {
        toast.success(`Achievement unlocked: ${ACHIEVEMENTS[id as AchievementId]}`);
      }
    }
    setPhase("finished");
  }

  function handleSelectOption(option: string, elapsedMs: number) {
    if (feedback) return;
    setSelectedOption(option);
    void handleAnswer(option === correctOptionText, speedFractionFrom("wordRush", elapsedMs));
  }

  function handleSubmitTyped(elapsedMs: number) {
    if (feedback || !currentWord || !subGame || !inputValue.trim()) return;
    if (subGame === "sentenceWeaver") {
      void handleAnswer(normalizeAndMatch(inputValue, currentWord.arabic, "arabic"), 0);
    } else {
      void handleAnswer(
        normalizeAndMatch(inputValue, currentWord.english, "english"),
        speedFractionFrom("typeSprint", elapsedMs),
      );
    }
  }

  function handleTimeout() {
    void handleAnswer(false, 0);
  }

  function handleNext() {
    const rest = queue.slice(1);
    setQueue(rest);
    setConsumed((c) => c + 1);
    setFeedback(null);
    setInputValue("");
    setSelectedOption(null);
    answeredRef.current = false;
    questionStartedAtRef.current = Date.now();
    if (rest.length === 0) void finishSession();
  }

  if (phase === "loading") {
    return <p className="text-muted-foreground text-center text-sm">Loading…</p>;
  }

  if (phase === "empty") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{categoryName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nothing due for practice right now — you&apos;re all caught up in this category.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/">Back to categories</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (phase === "finished") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session complete</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-lg">
            {tally.correctCount} / {tally.wordsShown} correct
          </p>
          <p className="text-muted-foreground text-sm">
            {tally.xpEarned} XP earned · best combo x{maxCombo}
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/">Back to categories</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!currentWord || !subGame) return null;

  const timeLimit = TIME_LIMIT_MS[subGame];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Progress value={progressPct} />

      <div className="flex items-center justify-between">
        <Badge variant="secondary">{SUB_GAME_LABEL[subGame]}</Badge>
        {combo > 1 && <Badge>Combo x{combo}</Badge>}
      </div>

      {timeLimit && (
        <TimerBar
          key={`${currentWord.id}-${subGame}`}
          limitMs={timeLimit}
          onTimeout={handleTimeout}
        />
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {subGame === "wordRush" && (
          <>
            <div className="flex items-center gap-2">
              <p className="font-arabic text-4xl" dir="rtl">
                {currentWord.arabic}
              </p>
              <SpeakButton text={currentWord.arabic} />
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-2">
              {wordRushOptions.map((option) => {
                const isSelected = selectedOption === option;
                const isCorrectOption = option === correctOptionText;
                return (
                  <Button
                    key={option}
                    variant={feedback && isCorrectOption ? "default" : "outline"}
                    disabled={!!feedback}
                    onClick={() =>
                      handleSelectOption(option, Date.now() - questionStartedAtRef.current)
                    }
                    className={cn(
                      "h-auto min-h-12 py-2 text-sm whitespace-normal",
                      feedback && isSelected && !isCorrectOption && "text-destructive",
                    )}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </>
        )}

        {subGame === "typeSprint" && (
          <>
            <div className="flex items-center gap-2">
              <p className="font-arabic text-4xl" dir="rtl">
                {currentWord.arabic}
              </p>
              <SpeakButton text={currentWord.arabic} />
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2">
              <Label htmlFor="type-sprint-answer" className="sr-only">
                Your answer
              </Label>
              <Input
                id="type-sprint-answer"
                autoFocus
                className="text-center text-xl"
                value={inputValue}
                disabled={!!feedback}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (feedback) handleNext();
                  else handleSubmitTyped(Date.now() - questionStartedAtRef.current);
                }}
              />
            </div>
          </>
        )}

        {subGame === "sentenceWeaver" && sentenceWeaver && (
          <>
            <div className="flex items-center gap-2">
              <p className="font-arabic text-2xl" dir="rtl">
                {sentenceWeaver.text}
              </p>
              <SpeakButton text={currentWord.exampleArabic ?? currentWord.arabic} />
            </div>
            {currentWord.exampleEnglish && (
              <p className="text-muted-foreground text-sm">{currentWord.exampleEnglish}</p>
            )}
            <div className="flex w-full max-w-sm flex-col gap-2">
              <Label htmlFor="sentence-weaver-answer" className="sr-only">
                Missing word
              </Label>
              <Input
                id="sentence-weaver-answer"
                autoFocus
                dir="rtl"
                className="font-arabic text-center text-xl"
                value={inputValue}
                disabled={!!feedback}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (feedback) handleNext();
                  else handleSubmitTyped(Date.now() - questionStartedAtRef.current);
                }}
              />
            </div>
          </>
        )}

        {feedback && (
          <div className="flex flex-col items-center gap-2">
            <p
              className={
                feedback.isCorrect
                  ? "text-lg font-semibold text-green-600"
                  : "text-destructive text-lg font-semibold"
              }
            >
              {feedback.isCorrect ? "✅ Correct" : "❌ Not quite"}
            </p>
            <p className={subGame === "sentenceWeaver" ? "font-arabic text-sm" : "text-sm"}>
              Correct answer: <span className="font-medium">{feedback.correctAnswer}</span>
            </p>
            {currentWord.exampleArabic && subGame !== "sentenceWeaver" && (
              <p className="font-arabic text-muted-foreground text-sm" dir="rtl">
                {currentWord.exampleArabic}
              </p>
            )}
            {currentWord.exampleEnglish && subGame !== "sentenceWeaver" && (
              <p className="text-muted-foreground text-sm">{currentWord.exampleEnglish}</p>
            )}
          </div>
        )}

        <div className="flex w-full max-w-sm gap-2">
          {subGame !== "wordRush" &&
            (!feedback ? (
              <Button
                className="flex-1"
                onClick={() => handleSubmitTyped(Date.now() - questionStartedAtRef.current)}
                disabled={!inputValue.trim()}
              >
                Check
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNext}>
                Next
              </Button>
            ))}
          {subGame === "wordRush" && feedback && (
            <Button className="flex-1" onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
