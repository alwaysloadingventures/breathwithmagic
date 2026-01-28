import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";

export interface HeroSectionProps {
  /** Custom className */
  className?: string;
}

/**
 * HeroSection - Homepage hero with value proposition and CTA
 *
 * Displays the main value proposition for the platform.
 * Links to the explore page and sign-up.
 */
export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-b from-accent/50 to-background",
        className,
      )}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.3),transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 py-20 md:py-28 lg:py-36 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight leading-tight">
            Find the practice that{" "}
            <span className="text-primary">feels right</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Breathwork, meditation, and movement from real teachers. No classes
            to book. No schedules to follow. Just practices that work for your
            life.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/explore"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-[48px] px-8 text-base font-medium",
              )}
            >
              Explore creators
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              href="/become-creator"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[48px] px-8 text-base font-medium",
              )}
            >
              Become a creator
            </Link>
          </div>

          {/* Trust Badge */}
          <p className="mt-8 text-sm text-muted-foreground">
            Trusted by creators building meaningful practice communities
          </p>
        </div>
      </div>
    </section>
  );
}
