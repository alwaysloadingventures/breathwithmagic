/**
 * Privacy Policy Page
 *
 * Explains data collection, usage, sharing, and user rights.
 * Includes GDPR/CCPA compliance sections and personalization data section from PRD.
 *
 * @see PRD Phase 6, Task 18: Content Moderation
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | breathwithmagic",
  description:
    "How breathwithmagic collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            How we handle your information.
          </p>

          {/* TL;DR */}
          <div className="bg-muted/50 border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium mt-0 mb-3">
              The short version
            </h2>
            <p className="text-sm text-muted-foreground mb-0">
              We collect what we need to run the platform. We don&apos;t sell
              your data. You can access, update, or delete your information
              anytime. We use cookies for essential functions and analytics. If
              you&apos;re in the EU or California, you have additional rights
              explained below.
            </p>
          </div>

          {/* Introduction */}
          <section className="mb-10">
            <p className="text-muted-foreground">
              This Privacy Policy explains how breathwithmagic (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects
              your personal information when you use our platform.
            </p>
            <p className="text-muted-foreground">
              We take your privacy seriously. We only collect information we
              need, we&apos;re transparent about how we use it, and we give you
              control over your data.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              1. Information we collect
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Information you provide
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Account information:</strong> Email, name, profile photo
                when you create an account
              </li>
              <li>
                <strong>Payment information:</strong> Processed securely through
                Stripe (we never see your full card number)
              </li>
              <li>
                <strong>Creator information:</strong> Bio, handle, category,
                banking details for payouts
              </li>
              <li>
                <strong>Content:</strong> Videos, audio, and text that creators
                upload
              </li>
              <li>
                <strong>Messages:</strong> Direct messages between subscribers
                and creators
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Information collected automatically
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Usage data:</strong> Pages visited, features used,
                content viewed
              </li>
              <li>
                <strong>Device information:</strong> Browser type, operating
                system, device type
              </li>
              <li>
                <strong>Log data:</strong> IP address, access times, error logs
              </li>
            </ul>
          </section>

          {/* 2. Personalization Data */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              2. Personalization data
            </h2>
            <p className="text-muted-foreground">
              When you use breathwithmagic, you may complete an onboarding
              questionnaire to personalize your experience. This collects:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                Your primary wellness goal (e.g., stress relief, better sleep)
              </li>
              <li>Your experience level with wellness practices</li>
              <li>Your preferred practice duration</li>
              <li>The types of practices you&apos;re interested in</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Health-related information
            </h3>
            <p className="text-muted-foreground">
              Some options (such as &quot;anxiety&quot; or &quot;better
              sleep&quot;) may relate to your health. We treat this information
              with extra care and only use it to improve your content
              recommendations.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Your choices
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>Skip personalization entirely</li>
              <li>Select &quot;Prefer not to say&quot; for sensitive questions</li>
              <li>Update or delete your data anytime in Settings</li>
            </ul>
          </section>

          {/* 3. How We Use Information */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              3. How we use your information
            </h2>
            <p className="text-muted-foreground">We use your information to:</p>
            <ul className="text-muted-foreground space-y-2">
              <li>Provide and improve our services</li>
              <li>Process payments and payouts</li>
              <li>Personalize your content recommendations</li>
              <li>Send important account notifications</li>
              <li>
                Send optional email updates (you can opt out in settings)
              </li>
              <li>Protect against fraud and abuse</li>
              <li>Respond to support requests</li>
              <li>Analyze and improve the platform</li>
            </ul>
          </section>

          {/* 4. Information Sharing */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              4. When we share information
            </h2>
            <p className="text-muted-foreground">
              <strong>We do not sell your personal information.</strong>
            </p>
            <p className="text-muted-foreground">
              We share information only in these circumstances:
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              With service providers
            </h3>
            <p className="text-muted-foreground">
              We work with trusted companies to run our platform:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Stripe:</strong> Payment processing
              </li>
              <li>
                <strong>Clerk:</strong> Authentication and account security
              </li>
              <li>
                <strong>Cloudflare:</strong> Content delivery and video hosting
              </li>
              <li>
                <strong>Vercel:</strong> Website hosting
              </li>
              <li>
                <strong>Neon:</strong> Database hosting
              </li>
              <li>
                <strong>Resend:</strong> Email delivery
              </li>
            </ul>
            <p className="text-muted-foreground">
              These providers only access information needed to perform their
              services and are bound by strict data protection agreements.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              With creators (for subscribers)
            </h3>
            <p className="text-muted-foreground">
              Creators can see subscriber names and email addresses to manage
              their community. They cannot see payment details or your activity
              with other creators.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">
              For legal reasons
            </h3>
            <p className="text-muted-foreground">
              We may share information if required by law or to protect our
              rights, safety, or the rights of others.
            </p>
          </section>

          {/* 5. Cookies */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              5. Cookies and tracking
            </h2>
            <p className="text-muted-foreground">
              We use cookies (small files stored on your device) to:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Keep you logged in</strong> (essential)
              </li>
              <li>
                <strong>Remember your preferences</strong> (essential)
              </li>
              <li>
                <strong>Understand how people use the platform</strong>{" "}
                (analytics)
              </li>
            </ul>
            <p className="text-muted-foreground">
              Most browsers let you control cookies in settings. Blocking
              essential cookies may prevent the platform from working properly.
            </p>
          </section>

          {/* 6. Data Retention */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              6. Data retention
            </h2>
            <p className="text-muted-foreground">
              We keep your information as long as your account is active or as
              needed to provide services to you.
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Account data:</strong> Retained while your account is
                active
              </li>
              <li>
                <strong>Content:</strong> Retained while your account is active
                or until you delete it
              </li>
              <li>
                <strong>Payment records:</strong> Kept for 7 years for legal and
                tax purposes
              </li>
              <li>
                <strong>Personalization data:</strong> Deleted within 30 days of
                account deletion
              </li>
            </ul>
            <p className="text-muted-foreground">
              When you delete your account, we remove your personal information
              within 30 days, except where we&apos;re legally required to keep
              it.
            </p>
          </section>

          {/* 7. Your Rights */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              7. Your rights and choices
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-6">
              Everyone can:
            </h3>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Access your data:</strong> See what information we have
                about you
              </li>
              <li>
                <strong>Update your information:</strong> Correct any inaccurate
                data
              </li>
              <li>
                <strong>Delete your account:</strong> Remove your data from our
                systems
              </li>
              <li>
                <strong>Download your data:</strong> Request a copy of your
                information
              </li>
              <li>
                <strong>Control email preferences:</strong> Choose which emails
                you receive
              </li>
            </ul>
            <p className="text-muted-foreground">
              You can exercise these rights from your account settings or by
              contacting us at{" "}
              <a
                href="mailto:privacy@breathwithmagic.com"
                className="text-primary hover:underline"
              >
                privacy@breathwithmagic.com
              </a>
              .
            </p>
          </section>

          {/* 8. For EU Users (GDPR) */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              8. For users in the European Union (GDPR)
            </h2>
            <p className="text-muted-foreground">
              If you&apos;re in the EU, you have additional rights under the
              General Data Protection Regulation (GDPR):
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Right to be forgotten:</strong> Request deletion of your
                personal data
              </li>
              <li>
                <strong>Right to restrict processing:</strong> Limit how we use
                your data
              </li>
              <li>
                <strong>Right to data portability:</strong> Receive your data in
                a portable format
              </li>
              <li>
                <strong>Right to object:</strong> Opt out of certain processing
                activities
              </li>
              <li>
                <strong>Right to withdraw consent:</strong> Change your mind
                about data you&apos;ve shared
              </li>
            </ul>
            <p className="text-muted-foreground">
              We process your data based on: your consent, contract fulfillment
              (providing our services), and legitimate interests (improving the
              platform, preventing fraud).
            </p>
            <p className="text-muted-foreground">
              You may also lodge a complaint with your local data protection
              authority.
            </p>
          </section>

          {/* 9. For California Users (CCPA) */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              9. For California residents (CCPA)
            </h2>
            <p className="text-muted-foreground">
              If you&apos;re a California resident, the California Consumer
              Privacy Act (CCPA) gives you additional rights:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Right to know:</strong> What personal information we
                collect and how we use it
              </li>
              <li>
                <strong>Right to delete:</strong> Request deletion of your
                personal information
              </li>
              <li>
                <strong>Right to opt-out:</strong> We do not sell personal
                information
              </li>
              <li>
                <strong>Right to non-discrimination:</strong> We won&apos;t
                treat you differently for exercising your rights
              </li>
            </ul>
            <p className="text-muted-foreground">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:privacy@breathwithmagic.com"
                className="text-primary hover:underline"
              >
                privacy@breathwithmagic.com
              </a>{" "}
              or call us at [phone number].
            </p>
          </section>

          {/* 10. Security */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              10. Security
            </h2>
            <p className="text-muted-foreground">
              We use industry-standard security measures to protect your
              information:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>Encryption in transit (HTTPS) and at rest</li>
              <li>Secure authentication with Clerk</li>
              <li>PCI-compliant payment processing through Stripe</li>
              <li>Regular security audits</li>
              <li>Access controls for our team</li>
            </ul>
            <p className="text-muted-foreground">
              While we work hard to protect your data, no system is 100% secure.
              If you believe your account has been compromised, please contact
              us immediately.
            </p>
          </section>

          {/* 11. Children */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              11. Children&apos;s privacy
            </h2>
            <p className="text-muted-foreground">
              breathwithmagic is not intended for anyone under 18. We do not
              knowingly collect information from children. If you believe a
              child has provided us with personal information, please contact us
              and we will delete it.
            </p>
          </section>

          {/* 12. International Transfers */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              12. International data transfers
            </h2>
            <p className="text-muted-foreground">
              Our servers are located in the United States. If you&apos;re
              outside the US, your information will be transferred to and
              processed in the US, where data protection laws may differ from
              your country. By using breathwithmagic, you consent to this
              transfer.
            </p>
          </section>

          {/* 13. Changes */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              13. Changes to this policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. When we make
              significant changes, we&apos;ll notify you by email or through the
              platform. The &quot;Last updated&quot; date at the bottom shows
              when this policy was last revised.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground">
              Contact us
            </h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or your data,
              please contact us:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:privacy@breathwithmagic.com"
                  className="text-primary hover:underline"
                >
                  privacy@breathwithmagic.com
                </a>
              </li>
              <li>
                <strong>Support:</strong>{" "}
                <a
                  href="mailto:support@breathwithmagic.com"
                  className="text-primary hover:underline"
                >
                  support@breathwithmagic.com
                </a>
              </li>
            </ul>
          </section>

          {/* Links */}
          <section className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground">
              Also see our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
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
