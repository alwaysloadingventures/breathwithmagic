/**
 * Trial Ending Email Template
 *
 * Sent on day 5 and day 6 of a 7-day trial to remind users.
 *
 * Subject: "Your free trial with [Creator] ends in X days"
 * Tone: Calm, helpful, not urgent or pushy
 */

import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface TrialEndingEmailProps {
  creatorName: string;
  daysRemaining: number;
  subscribeUrl: string;
  unsubscribeUrl: string;
}

// Brand colors (warm neutrals)
const colors = {
  primary: "#8B6B52",
  text: "#2D2A26",
  muted: "#736B62",
  amber: "#B8860B",
};

export function TrialEndingEmail({
  creatorName,
  daysRemaining,
  subscribeUrl,
  unsubscribeUrl,
}: TrialEndingEmailProps) {
  const dayWord = daysRemaining === 1 ? "day" : "days";
  const previewText = `Your free trial with ${creatorName} ends in ${daysRemaining} ${dayWord}`;

  return (
    <BaseLayout previewText={previewText} unsubscribeUrl={unsubscribeUrl}>
      <Heading style={heading}>
        Your trial ends in {daysRemaining} {dayWord}
      </Heading>

      <Text style={paragraph}>
        A quick heads-up: your free trial with {creatorName} ends in{" "}
        {daysRemaining} {dayWord}.
      </Text>

      <Text style={paragraph}>
        If you&apos;ve been enjoying the content and want to keep going, your
        subscription will continue automatically. You don&apos;t need to do
        anything.
      </Text>

      <Text style={paragraph}>
        Not feeling it? You can cancel anytime before the trial ends.
      </Text>

      <Button style={button} href={subscribeUrl}>
        View your subscription
      </Button>

      <Text style={footerNote}>
        Questions about your trial? Visit your subscriptions page to see your
        billing details and make changes.
      </Text>
    </BaseLayout>
  );
}

// Styles
const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "600",
  color: colors.text,
  margin: "0 0 24px 0",
  lineHeight: "32px",
};

const paragraph: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: colors.text,
  margin: "0 0 16px 0",
};

const button: React.CSSProperties = {
  backgroundColor: colors.primary,
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
  margin: "8px 0 24px 0",
};

const footerNote: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: colors.muted,
  margin: "24px 0 0 0",
};

export default TrialEndingEmail;
