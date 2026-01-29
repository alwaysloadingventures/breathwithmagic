/**
 * Payment Failed Email Template
 *
 * Sent when a subscription payment fails.
 *
 * Subject: "Your payment needs attention"
 * Tone: Helpful, clear, calm
 */

import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface PaymentFailedEmailProps {
  creatorName: string;
  updatePaymentUrl: string;
  unsubscribeUrl: string;
}

// Brand colors (warm neutrals)
const colors = {
  primary: "#8B6B52",
  text: "#2D2A26",
  muted: "#736B62",
};

export function PaymentFailedEmail({
  creatorName,
  updatePaymentUrl,
  unsubscribeUrl,
}: PaymentFailedEmailProps) {
  const previewText = `Your recent payment for ${creatorName} didn't go through`;

  return (
    <BaseLayout previewText={previewText} unsubscribeUrl={unsubscribeUrl}>
      <Heading style={heading}>We couldn&apos;t process your payment</Heading>

      <Text style={paragraph}>
        Your recent payment for {creatorName} didn&apos;t go through.
      </Text>

      <Text style={paragraph}>
        This happens sometimes. Your card might have expired, been declined, or
        there could be a temporary issue with your bank.
      </Text>

      <Text style={paragraph}>
        To keep your subscription active and continue accessing{" "}
        {creatorName}&apos;s content, please update your payment method.
      </Text>

      <Button style={button} href={updatePaymentUrl}>
        Update payment method
      </Button>

      <Text style={footerNote}>
        Already fixed it? You can ignore this. We&apos;ll automatically retry
        the payment.
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

export default PaymentFailedEmail;
