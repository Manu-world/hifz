"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Optional stretch feature from the PRD: auditory exposure via the browser's
// speechSynthesis API. No-ops silently on unsupported browsers.
export function SpeakButton({ text, className }: { text: string; className?: string }) {
  function handleSpeak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      onClick={handleSpeak}
      aria-label="Listen to pronunciation"
      className={className}
    >
      <Volume2 />
    </Button>
  );
}
