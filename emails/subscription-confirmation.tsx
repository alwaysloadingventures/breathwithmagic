/**
 * Subscription Confirmation Email Template
 *
 * Sent when a subscription starts (after checkout or when trial converts).
 *
 * Subject: "Welcome to [Creator]'s community"
 * Tone: Warm, welcoming, celebratory but calm
 */

import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface SubscriptionConfirmationEmailProps {
  creatorName: string;
  amount: string; // Formatted amount like "$10.00"
  subscriptionsUrl: string;
  unsubscribeUrl: string;
}

// Brand colors (warm neutrals)
const colors = {
  primary: "#8B6B52",
  text: "#2D2A26",
  muted: "#736B62",
  accent: "#F0EBE5",
};

export function SubscriptionConfirmationEmail({
  creatorName,
  amount,
  subscriptionsUrl,
  unsubscribeUrl,
}: SubscriptionConfirmationEmailProps) {
  const previewText = `Welcome! You're now subscribed to ${creatorName}`;

  return (
    <BaseLayout previewText={previewText} unsubscribeUrl={unsubscribeUrl}>
      <Heading style={heading}>Welcome to {creatorName}&apos;s community</Heading>

      <Text style={paragraph}>
        Welcome! You now have access to everything {creatorName} creates.
      </Text>

      <div style={detailsBox}>
        <Text style={detailsText}>
          <strong>Subscription:</strong> {creatorName}
        </Text>
        <Text style={detailsText}>
          <strong>Amount:</strong> {amount}/month
        </Text>
        <Text style={detailsText}>
          <strong>Billing:</strong> Monthly (starts today)
        </Text>
      </div>

      <Text style={paragraph}>
        Take your time exploring. No pressure to watch everything at once.
        It&apos;ll all be here when you&apos;re ready.
      </Text>

      <Button style={button} href={subscriptionsUrl}>
        View your subscriptions
      </Button>

      <Text style={footerNote}>
        You can manage your subscription, update payment methods, or cancel
        anytime from your subscriptions page.
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

const detailsBox: React.CSSProperties = {
  backgroundColor: colors.accent,
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "0 0 24px 0",
};

const detailsText: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: colors.text,
  margin: "0 0 4px 0",
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

export default SubscriptionConfirmationEmail;
