"use client";

import Link from "next/link";
import { FileQuestion, Search, Home, ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Not Found page for content that doesn't exist
 *
 * Displays a warm, friendly message when content isn't found.
 * Provides helpful navigation options.
 *
 * Design: Uses warm neutrals per design system.
 * Copy: Calm, human, helpful per brand voice guidelines.
 */
export default function ContentNotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-muted w-fit">
            <FileQuestion className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Content not found</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            This content may have been removed by the creator, or the link might
            be outdated. Here are some things you can do instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/explore"
            className={cn(
              buttonVariants(),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Search className="size-4 mr-2" aria-hidden="true" />
            Explore creators
          </Link>
          <Link
            href="/home"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Home className="size-4 mr-2" aria-hidden="true" />
            Go to your feed
          </Link>
          <button
            onClick={() => window.history.back()}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
            Go back
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
