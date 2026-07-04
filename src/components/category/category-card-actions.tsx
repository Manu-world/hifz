"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteCategoryAction, renameCategoryAction } from "@/lib/actions/category.actions";

export function CategoryCardActions({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(categoryName);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleRename(formData: FormData) {
    startTransition(async () => {
      try {
        await renameCategoryAction(formData);
        toast.success(`Renamed to "${formData.get("name")}"`);
        setRenameOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to rename category.");
      }
    });
  }

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      try {
        await deleteCategoryAction(formData);
        toast.success(`Deleted "${categoryName}"`);
        setDeleteOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete category.");
      }
    });
  }

  return (
    <div className="flex gap-1">
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Rename category">
            <Pencil />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
            <DialogDescription>Choose a new name for &quot;{categoryName}&quot;.</DialogDescription>
          </DialogHeader>
          <form ref={formRef} action={handleRename} className="flex flex-col gap-3">
            <input type="hidden" name="categoryId" value={categoryId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-input">Category name</Label>
              <Input
                id="rename-input"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !name.trim()}>
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
            aria-label="Delete category"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &quot;{categoryName}&quot;?</DialogTitle>
            <DialogDescription>
              This permanently deletes the category and all of its words and progress. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <form action={handleDelete}>
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
  );
}
