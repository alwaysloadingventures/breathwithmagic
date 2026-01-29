/**
 * Terms of Service Page
 *
 * Legal terms for using breathwithmagic, written in clear language.
 * Includes key sections on accounts, subscriptions, content, refunds, and termination.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | breathwithmagic",
  description:
    "Terms and conditions for using the breathwithmagic wellness platform.",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            The agreement between you and breathwithmagic.
          </p>

          {/* TL;DR */}
          <div className="bg-muted/50 border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium mt-0 mb-3">
              The short version
            </h2>
            <p className="text-sm text-muted-foreground mb-0">
              By using breathwithmagic, you agree to these terms. You&apos;re
              responsible for your account and the content you share.
              Subscriptions renew automatically. You can cancel anytime from
              your settings. We take a 15% platform fee from creator earnings.
              We can update these terms with notice.
            </p>
          </div>

          {/* Welcome */}
          <section className="mb-10">
            <p className="text-muted-foreground">
              Welcome to breathwithmagic. These Terms of Service
              (&quot;Terms&quot;) are an agreement between you and
              breathwithmagic (&quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;). They explain the rules for using our platform.
            </p>
            <p className="text-muted-foreground">
              By creating an account or using our services, you agree to these
              Terms. If you don&apos;t agree, please don&apos;t use
              breathwithmagic.
            </p>
          </section>

          {/* 1. Your Account */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              1. Your account
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Creating an account
            </h3>
            <p className="text-muted-foreground">
              You need an account to subscribe to creators or become a creator
              yourself. When you create an account, the information you provide
              must be accurate. You&apos;re responsible for keeping your account
              secure.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Account requirements
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>You must be at least 18 years old</li>
              <li>You can only have one account</li>
              <li>
                You&apos;re responsible for everything that happens under your
                account
              </li>
              <li>
                If you think someone else has access to your account, let us
                know immediately
              </li>
            </ul>
          </section>

          {/* 2. Subscriptions */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              2. Subscriptions and payments
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              How subscriptions work
            </h3>
            <p className="text-muted-foreground">
              When you subscribe to a creator, you get access to their content
              for a monthly fee. Subscriptions renew automatically each month
              until you cancel.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Pricing and trials
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>Prices are set by creators and shown before you subscribe</li>
              <li>
                Some creators offer a 7-day free trial. You can try one trial
                per creator.
              </li>
              <li>
                If a creator changes their price, you keep your original price
                as long as your subscription stays active
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Canceling
            </h3>
            <p className="text-muted-foreground">
              You can cancel anytime from your account settings. When you
              cancel, you keep access until the end of your current billing
              period. We don&apos;t offer partial refunds for unused time.
            </p>
          </section>

          {/* 3. Refunds */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              3. Refunds
            </h2>
            <p className="text-muted-foreground">
              We want you to be happy with your subscriptions, but we also need
              to be fair to creators who count on their earnings.
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Within 7 days of billing:</strong> You can request a
                prorated refund if you&apos;re not satisfied
              </li>
              <li>
                <strong>After 7 days:</strong> Refunds are generally not
                available
              </li>
              <li>
                <strong>Free trials:</strong> Cancel before the trial ends to
                avoid being charged
              </li>
            </ul>
            <p className="text-muted-foreground">
              To request a refund, contact us at{" "}
              <a
                href="mailto:support@breathwithmagic.com"
                className="text-primary hover:underline"
              >
                support@breathwithmagic.com
              </a>
              .
            </p>
          </section>

          {/* 4. For Creators */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              4. For creators
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Platform fees
            </h3>
            <p className="text-muted-foreground">
              We charge a <strong>15% platform fee</strong> on subscription
              earnings. This covers payment processing, hosting, support, and
              platform development. For example, if a subscriber pays $10/month,
              you receive $8.50.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Payouts
            </h3>
            <p className="text-muted-foreground">
              We process payouts weekly through Stripe. There&apos;s a 7-day
              holding period on earnings to account for potential refunds or
              disputes. You need a valid Stripe account to receive payouts.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Your content
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>You own the content you create and upload</li>
              <li>
                By uploading content, you give us permission to display it to
                your subscribers and use it to promote the platform
              </li>
              <li>
                You&apos;re responsible for making sure you have the rights to
                share your content
              </li>
              <li>
                Content must follow our{" "}
                <Link
                  href="/guidelines"
                  className="text-primary hover:underline"
                >
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </section>

          {/* 5. Content Rules */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              5. Content rules
            </h2>
            <p className="text-muted-foreground">
              Our{" "}
              <Link href="/guidelines" className="text-primary hover:underline">
                Community Guidelines
              </Link>{" "}
              explain what content is and isn&apos;t allowed. In short:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                No illegal content, harassment, hate speech, or explicit
                material
              </li>
              <li>No false medical claims or unsafe practices</li>
              <li>No spam or misleading content</li>
              <li>Respect copyright and intellectual property</li>
            </ul>
            <p className="text-muted-foreground">
              We can remove content that violates these rules and may suspend or
              terminate accounts for serious or repeated violations.
            </p>
          </section>

          {/* 6. Termination */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              6. Account termination
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              You can leave anytime
            </h3>
            <p className="text-muted-foreground">
              You can delete your account at any time. Active subscriptions will
              remain until the end of their current billing period. Creators
              should download their content before deleting their account.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              When we might terminate your account
            </h3>
            <p className="text-muted-foreground">
              We may suspend or terminate your account if you:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>Seriously or repeatedly violate these Terms</li>
              <li>Break our Community Guidelines</li>
              <li>Engage in fraud or abuse</li>
              <li>Harm other users or the platform</li>
            </ul>
            <p className="text-muted-foreground">
              We&apos;ll try to give you warning and a chance to fix issues when
              possible, but serious violations may result in immediate
              termination.
            </p>
          </section>

          {/* 7. Disputes */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              7. Disputes and liability
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Resolving disagreements
            </h3>
            <p className="text-muted-foreground">
              If you have a problem, please contact us first at{" "}
              <a
                href="mailto:support@breathwithmagic.com"
                className="text-primary hover:underline"
              >
                support@breathwithmagic.com
              </a>
              . Most issues can be resolved through a conversation.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Limitations
            </h3>
            <p className="text-muted-foreground">
              breathwithmagic is provided &quot;as is.&quot; While we work hard
              to keep the platform running smoothly, we can&apos;t guarantee
              it&apos;ll be perfect all the time. We&apos;re not responsible for
              content created by users, and wellness content is not a substitute
              for professional medical advice.
            </p>
          </section>

          {/* 8. Changes */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              8. Changes to these terms
            </h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. When we make
              significant changes, we&apos;ll let you know by email or through
              the platform at least 30 days before they take effect. Continuing
              to use breathwithmagic after changes take effect means you accept
              the new Terms.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              Questions?
            </h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms, please contact us at{" "}
              <a
                href="mailto:legal@breathwithmagic.com"
                className="text-primary hover:underline"
              >
                legal@breathwithmagic.com
              </a>
              .
            </p>
          </section>

          {/* Links */}
          <section className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground">
              Also see our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/guidelines" className="text-primary hover:underline">
                Community Guidelines
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
