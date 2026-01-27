/**
 * Stripe Dashboard Button
 *
 * Client component that handles fetching and redirecting to the Stripe
 * Express dashboard. Uses the dashboard-link API to generate a login link.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";

export function StripeDashboardButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/creator/stripe/dashboard-link", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open Stripe dashboard");
      }

      // Redirect to Stripe dashboard
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Error opening Stripe dashboard:", err);
      setError(
        err instanceof Error ? err.message : "Failed to open Stripe dashboard",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        variant="outline"
        size="lg"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Opening...
          </>
        ) : (
          <>
            Stripe Dashboard
            <ExternalLink className="ml-2 size-4" />
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
