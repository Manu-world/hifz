"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MAX_BOX } from "@/lib/practice/scheduler";
import {
  deleteWordAction,
  toggleWordDoneAction,
  updateWordAction,
} from "@/lib/actions/word.actions";
import type { listWordsByCategory } from "@/lib/repositories/word.repository";

type WordWithProgress = Awaited<ReturnType<typeof listWordsByCategory>>[number];

export function WordListTable({
  categoryId,
  words,
}: {
  categoryId: string;
  words: WordWithProgress[];
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Arabic</TableHead>
            <TableHead>English</TableHead>
            <TableHead>Box</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {words.map((word) => (
            <WordRow key={word.id} categoryId={categoryId} word={word} />
          ))}
        </TableBody>
      </Table>
      {words.length === 0 && (
        <p className="text-muted-foreground p-6 text-center text-sm">
          No words in this category yet.
        </p>
      )}
    </div>
  );
}

function WordRow({ categoryId, word }: { categoryId: string; word: WordWithProgress }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDone = word.progress?.isDone ?? false;
  const isMastered = isDone || (word.progress?.box ?? 0) >= MAX_BOX;

  function handleToggleDone() {
    startTransition(async () => {
      try {
        await toggleWordDoneAction(word.id, categoryId, !isDone);
      } catch {
        toast.error("Failed to update word.");
      }
    });
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      try {
        await updateWordAction(formData);
        toast.success("Word updated.");
        setEditOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update word.");
      }
    });
  }

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      try {
        await deleteWordAction(formData);
        toast.success("Word deleted.");
        setDeleteOpen(false);
      } catch {
        toast.error("Failed to delete word.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell dir="rtl" className="font-arabic text-right">
        {word.arabic}
      </TableCell>
      <TableCell>{word.english}</TableCell>
      <TableCell>{word.progress?.box ?? 0}</TableCell>
      <TableCell>
        <Button
          size="sm"
          variant={isDone ? "default" : "outline"}
          onClick={handleToggleDone}
          disabled={isPending}
        >
          {isDone ? "Done" : isMastered ? "Mastered" : "Active"}
        </Button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Edit word">
                <Pencil />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit word</DialogTitle>
              </DialogHeader>
              <form action={handleUpdate} className="flex flex-col gap-3">
                <input type="hidden" name="wordId" value={word.id} />
                <input type="hidden" name="categoryId" value={categoryId} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`arabic-${word.id}`}>Arabic</Label>
                  <Input
                    id={`arabic-${word.id}`}
                    name="arabic"
                    dir="rtl"
                    className="font-arabic"
                    defaultValue={word.arabic}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`english-${word.id}`}>English</Label>
                  <Input
                    id={`english-${word.id}`}
                    name="english"
                    defaultValue={word.english}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`example-ar-${word.id}`}>Example (Arabic)</Label>
                  <Input
                    id={`example-ar-${word.id}`}
                    name="exampleArabic"
                    dir="rtl"
                    className="font-arabic"
                    defaultValue={word.exampleArabic ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`example-en-${word.id}`}>Example (English)</Label>
                  <Input
                    id={`example-en-${word.id}`}
                    name="exampleEnglish"
                    defaultValue={word.exampleEnglish ?? ""}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving…" : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Delete word"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this word?</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground text-sm" dir="rtl">
                <span className="font-arabic">{word.arabic}</span>
              </p>
              <form action={handleDelete}>
                <input type="hidden" name="wordId" value={word.id} />
                <input type="hidden" name="categoryId" value={categoryId} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive" disabled={isPending}>
                    {isPending ? "Deleting…" : "Delete"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
