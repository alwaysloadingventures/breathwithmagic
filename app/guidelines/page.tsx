/**
 * Community Guidelines Page
 *
 * Outlines what content is allowed, what isn't, and consequences for violations.
 * Written in a warm, human tone that aligns with the breathwithmagic brand.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Guidelines | breathwithmagic",
  description:
    "Our community guidelines help create a safe, supportive space for wellness practice.",
};

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
      >
        Skip to main content
      </a>

      <main id="main-content" className="container max-w-3xl py-12 px-4">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Community Guidelines
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Creating a space where everyone can practice with peace of mind.
          </p>

          {/* TL;DR */}
          <div className="bg-muted/50 border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium mt-0 mb-3">
              The short version
            </h2>
            <p className="text-sm text-muted-foreground mb-0">
              Be respectful. Share authentic wellness content. Keep it safe for
              everyone. If something feels off, let us know. We&apos;re here to
              help.
            </p>
          </div>

          {/* What We're Building Together */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              What we&apos;re building together
            </h2>
            <p className="text-muted-foreground">
              breathwithmagic is a place where wellness teachers share their
              practice with people who want to feel better. We believe in the
              power of breathwork, meditation, yoga, and mindfulness to help
              people find calm in their daily lives.
            </p>
            <p className="text-muted-foreground">
              For this to work, we need everyone&mdash;creators and
              subscribers&mdash;to help keep this space supportive, safe, and
              genuine.
            </p>
          </section>

          {/* For Creators */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              For creators
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              What we love to see
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>
                Authentic teaching that comes from your real experience and
                training
              </li>
              <li>Content that helps people feel more grounded and centered</li>
              <li>Clear guidance that meets people where they are</li>
              <li>
                Honest descriptions of what your practice can (and can&apos;t)
                do
              </li>
              <li>Respect for your subscribers&apos; time and trust</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">
              What doesn&apos;t belong here
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Medical claims:</strong> We&apos;re not doctors.
                Don&apos;t promise to cure or treat medical conditions.
              </li>
              <li>
                <strong>Unsafe practices:</strong> If a technique could harm
                someone, it needs proper disclaimers and shouldn&apos;t be
                presented to beginners.
              </li>
              <li>
                <strong>Misleading content:</strong> Be honest about your
                qualifications and what your content offers.
              </li>
              <li>
                <strong>Copied content:</strong> Only share content you created
                or have rights to share.
              </li>
              <li>
                <strong>Explicit or harmful material:</strong> This is a
                wellness platform, not a place for adult content or anything
                that could harm others.
              </li>
            </ul>
          </section>

          {/* For Everyone */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              For everyone
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Be kind
            </h3>
            <p className="text-muted-foreground">
              This might seem obvious, but it&apos;s worth saying. Treat others
              the way you&apos;d want to be treated. When you send a message,
              imagine the person reading it. Wellness practice can be deeply
              personal, so let&apos;s keep our interactions supportive.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              What we don&apos;t tolerate
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Harassment:</strong> Targeting someone with unwanted
                messages, threats, or bullying
              </li>
              <li>
                <strong>Hate speech:</strong> Content that attacks people based
                on who they are
              </li>
              <li>
                <strong>Spam:</strong> Flooding conversations with promotions or
                repetitive content
              </li>
              <li>
                <strong>Impersonation:</strong> Pretending to be someone
                you&apos;re not
              </li>
              <li>
                <strong>Privacy violations:</strong> Sharing someone&apos;s
                personal information without consent
              </li>
            </ul>
          </section>

          {/* When Things Go Wrong */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              When things go wrong
            </h2>
            <p className="text-muted-foreground">
              If you see something that doesn&apos;t feel right, please let us
              know. You can report content directly using the flag icon, or
              reach out to our team at{" "}
              <a
                href="mailto:support@breathwithmagic.com"
                className="text-primary hover:underline"
              >
                support@breathwithmagic.com
              </a>
              .
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              What happens when someone breaks the rules
            </h3>
            <p className="text-muted-foreground">
              We review every report carefully. Depending on what happened, we
              might:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                Send a friendly reminder about our guidelines (for minor or
                first-time issues)
              </li>
              <li>Remove specific content that violates our guidelines</li>
              <li>
                Temporarily suspend an account to allow time for things to cool
                down
              </li>
              <li>
                Permanently remove accounts that repeatedly or seriously violate
                our guidelines
              </li>
            </ul>
            <p className="text-muted-foreground">
              We try to be fair and proportionate. Our goal is to help people
              understand and follow the guidelines, not to punish.
            </p>
          </section>

          {/* Questions */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">Questions?</h2>
            <p className="text-muted-foreground">
              If you&apos;re not sure whether something is okay, just ask. We&apos;re
              happy to help clarify. Reach out at{" "}
              <a
                href="mailto:support@breathwithmagic.com"
                className="text-primary hover:underline"
              >
                support@breathwithmagic.com
              </a>
              .
            </p>
          </section>

          {/* Links */}
          <section className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground">
              These guidelines work alongside our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: January 2026
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
