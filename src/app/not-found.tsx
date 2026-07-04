import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This category or word doesn&apos;t exist — it may have been deleted.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/">Back to categories</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
