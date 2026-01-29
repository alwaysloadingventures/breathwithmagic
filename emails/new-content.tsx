/**
 * New Content Email Template
 *
 * Sent when a creator publishes new content to notify subscribers and followers.
 *
 * Subject: "New from [Creator]: [Content Title]"
 * Tone: Calm, warm, inviting
 */

import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface NewContentEmailProps {
  creatorName: string;
  contentTitle: string;
  contentUrl: string;
  unsubscribeUrl: string;
}

// Brand colors (warm neutrals)
const colors = {
  primary: "#8B6B52",
  text: "#2D2A26",
  muted: "#736B62",
};

export function NewContentEmail({
  creatorName,
  contentTitle,
  contentUrl,
  unsubscribeUrl,
}: NewContentEmailProps) {
  const previewText = `${creatorName} just published "${contentTitle}"`;

  return (
    <BaseLayout previewText={previewText} unsubscribeUrl={unsubscribeUrl}>
      <Heading style={heading}>New content from {creatorName}</Heading>

      <Text style={paragraph}>
        {creatorName} just shared something new with you:
      </Text>

      <Text style={contentTitleStyle}>&ldquo;{contentTitle}&rdquo;</Text>

      <Text style={paragraph}>
        Take a moment when you are ready. There is no rush.
      </Text>

      <Button style={button} href={contentUrl}>
        View content
      </Button>

      <Text style={footerNote}>
        You are receiving this because you follow or subscribe to {creatorName}.
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

const contentTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  lineHeight: "28px",
  color: colors.primary,
  fontWeight: "500",
  margin: "0 0 24px 0",
  fontStyle: "italic",
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

export default NewContentEmail;
