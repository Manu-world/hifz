"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { normalizeAndMatch } from "@/lib/practice/matcher";

type Mode = "recall" | "reverse";

type PracticeWord = {
  id: string;
  arabic: string;
  english: string;
  exampleArabic: string | null;
  exampleEnglish: string | null;
};

type Phase = "choose-mode" | "loading" | "empty" | "active" | "finished";

type Result = { isCorrect: boolean; correctAnswer: string } | null;

export function PracticeSession({
  categoryId,
  categoryName,
  initialMode,
  initialRevise,
}: {
  categoryId: string;
  categoryName: string;
  initialMode: Mode | null;
  initialRevise: boolean;
}) {
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [revise, setRevise] = useState(initialRevise);
  const [phase, setPhase] = useState<Phase>(initialMode ? "loading" : "choose-mode");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queue, setQueue] = useState<PracticeWord[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [tally, setTally] = useState({ wordsShown: 0, correctCount: 0 });
  const tallyRef = useRef(tally);

  const currentWord = queue[0] ?? null;

  useEffect(() => {
    tallyRef.current = tally;
  }, [tally]);

  useEffect(() => {
    if (!mode) return;
    let cancelled = false;

    async function start() {
      setPhase("loading");
      const wordsRes = await fetch(
        `/api/words/due?categoryId=${categoryId}&revise=${revise ? "1" : "0"}`,
      );
      const { words } = (await wordsRes.json()) as { words: PracticeWord[] };
      if (cancelled) return;

      if (words.length === 0) {
        setPhase("empty");
        return;
      }

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, categoryId, isRevision: revise }),
      });
      const { session } = (await sessionRes.json()) as { session: { id: string } };
      if (cancelled) return;

      setSessionId(session.id);
      setQueue(words);
      setTotalWords(words.length);
      setPhase("active");
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [mode, categoryId, revise]);

  const side = mode === "recall" ? "english" : "arabic";
  const prompt = currentWord ? (mode === "recall" ? currentWord.arabic : currentWord.english) : "";
  const correctAnswerRaw = currentWord
    ? mode === "recall"
      ? currentWord.english
      : currentWord.arabic
    : "";

  const progressPct = useMemo(() => {
    if (totalWords === 0) return 0;
    return Math.round(((totalWords - queue.length) / totalWords) * 100);
  }, [totalWords, queue.length]);

  async function finishSession(finalTally: { wordsShown: number; correctCount: number }) {
    if (sessionId) {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...finalTally, xpEarned: 0 }),
      });
    }
    setPhase("finished");
  }

  async function handleSubmit() {
    if (!currentWord || result) return;

    const isCorrect = normalizeAndMatch(inputValue, correctAnswerRaw, side);
    setResult({ isCorrect, correctAnswer: correctAnswerRaw });
    setTally((prev) => {
      const next = {
        wordsShown: prev.wordsShown + 1,
        correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      };
      tallyRef.current = next;
      return next;
    });

    await fetch("/api/progress/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: currentWord.id, isCorrect }),
    });
  }

  function handleNext() {
    const rest = queue.slice(1);
    setQueue(rest);
    setInputValue("");
    setResult(null);
    if (rest.length === 0) {
      finishSession(tallyRef.current);
    }
  }

  async function handleMarkDone() {
    if (!currentWord) return;
    await fetch(`/api/progress/${currentWord.id}/done`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true }),
    });
    const rest = queue.slice(1);
    setQueue(rest);
    setInputValue("");
    setResult(null);
    if (rest.length === 0) {
      finishSession(tallyRef.current);
    }
  }

  if (phase === "choose-mode") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{categoryName}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              setMode("recall");
              setRevise(false);
            }}
          >
            Recall (Arabic → English)
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => {
              setMode("reverse");
              setRevise(false);
            }}
          >
            Reverse (English → Arabic)
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => {
              setMode("recall");
              setRevise(true);
            }}
          >
            Revise All
          </Button>
        </CardContent>
      </Card>
    );
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
            {revise
              ? "No words found in this category yet. Import words first, then revise all."
              : "Nothing due for practice right now — you&apos;re all caught up in this category."}
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
        <CardContent>
          <p className="text-lg">
            {tally.correctCount} / {tally.wordsShown} correct
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

  // phase === "active"
  return (
    <div className="flex flex-1 flex-col gap-6">
      <Progress value={progressPct} />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p
          className={mode === "recall" ? "font-arabic text-4xl" : "text-3xl"}
          dir={mode === "recall" ? "rtl" : "ltr"}
        >
          {prompt}
        </p>

        <div className="flex w-full max-w-sm flex-col gap-2">
          <Label htmlFor="answer" className="sr-only">
            Your answer
          </Label>
          <Input
            id="answer"
            autoFocus
            dir={mode === "reverse" ? "rtl" : "ltr"}
            className={
              mode === "reverse" ? "font-arabic text-center text-xl" : "text-center text-xl"
            }
            value={inputValue}
            disabled={!!result}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (result) {
                handleNext();
              } else {
                handleSubmit();
              }
            }}
          />
        </div>

        {result && (
          <div className="flex flex-col items-center gap-2">
            <p
              className={
                result.isCorrect
                  ? "text-lg font-semibold text-green-600"
                  : "text-destructive text-lg font-semibold"
              }
            >
              {result.isCorrect ? "✅ Correct" : "❌ Not quite"}
            </p>
            <p className="text-sm">
              Correct answer: <span className="font-medium">{result.correctAnswer}</span>
            </p>
            {currentWord?.exampleArabic && (
              <p className="font-arabic text-muted-foreground text-sm" dir="rtl">
                {currentWord.exampleArabic}
              </p>
            )}
            {currentWord?.exampleEnglish && (
              <p className="text-muted-foreground text-sm">{currentWord.exampleEnglish}</p>
            )}
          </div>
        )}

        <div className="flex w-full max-w-sm gap-2">
          {!result ? (
            <Button className="flex-1" onClick={handleSubmit} disabled={!inputValue.trim()}>
              Check
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleNext}>
              Next
            </Button>
          )}
          <Button variant="outline" onClick={handleMarkDone}>
            Mark as done
          </Button>
        </div>
      </div>
    </div>
  );
}
