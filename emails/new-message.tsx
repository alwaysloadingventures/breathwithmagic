/**
 * New Message Email Template
 *
 * Sent when a user receives a direct message.
 *
 * Subject: "[Sender] sent you a message"
 * Tone: Calm, friendly
 */

import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface NewMessageEmailProps {
  senderName: string;
  messagePreview: string;
  messagesUrl: string;
  unsubscribeUrl: string;
}

// Brand colors (warm neutrals)
const colors = {
  primary: "#8B6B52",
  text: "#2D2A26",
  muted: "#736B62",
  accent: "#F0EBE5",
};

export function NewMessageEmail({
  senderName,
  messagePreview,
  messagesUrl,
  unsubscribeUrl,
}: NewMessageEmailProps) {
  const previewText = `${senderName} sent you a message`;

  return (
    <BaseLayout previewText={previewText} unsubscribeUrl={unsubscribeUrl}>
      <Heading style={heading}>New message from {senderName}</Heading>

      <Text style={paragraph}>You have a new message:</Text>

      <div style={messageBox}>
        <Text style={messageText}>
          {messagePreview}
          {messagePreview.length >= 200 && "..."}
        </Text>
      </div>

      <Button style={button} href={messagesUrl}>
        View message
      </Button>

      <Text style={footerNote}>
        Reply when you are ready. Messages are private between you and{" "}
        {senderName}.
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

const messageBox: React.CSSProperties = {
  backgroundColor: colors.accent,
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "0 0 24px 0",
};

const messageText: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: colors.text,
  margin: "0",
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

export default NewMessageEmail;
