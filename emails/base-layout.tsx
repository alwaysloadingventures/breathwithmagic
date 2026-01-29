/**
 * Base Email Layout
 *
 * Shared wrapper for all email templates.
 * Uses warm neutral color scheme matching the breathwithmagic brand.
 *
 * Colors:
 * - Background: warm off-white (#FBF9F7)
 * - Primary: terracotta (#8B6B52)
 * - Text: warm dark gray (#2D2A26)
 * - Muted: medium warm gray (#736B62)
 * - Accent/Border: warm cream (#F0EBE5)
 */

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  previewText: string;
  children: React.ReactNode;
  unsubscribeUrl: string;
}

// Brand colors (warm neutrals)
const colors = {
  background: "#FBF9F7",
  primary: "#8B6B52",
  text: "#2D2A26",
  muted: "#736B62",
  accent: "#F0EBE5",
  border: "#E5DFD8",
};

export function BaseLayout({
  previewText,
  children,
  unsubscribeUrl,
}: BaseLayoutProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://breathwithmagic.com";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={header}>
            <Link href={appUrl} style={logoLink}>
              <Img
                src={`${appUrl}/logo.png`}
                width="40"
                height="40"
                alt="breathwithmagic"
                style={logoImage}
              />
              <Text style={logoText}>breathwithmagic</Text>
            </Link>
          </Section>

          {/* Main content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because you have a breathwithmagic
              account. If this doesn&apos;t seem right, let us know.
            </Text>
            <Text style={footerLinks}>
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>
              {" | "}
              <Link href={`${appUrl}/settings/email-preferences`} style={footerLink}>
                Email Preferences
              </Link>
              {" | "}
              <Link href={`${appUrl}/privacy`} style={footerLink}>
                Privacy Policy
              </Link>
            </Text>
            <Text style={copyright}>
              breathwithmagic - Wellness practices from real teachers
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main: React.CSSProperties = {
  backgroundColor: colors.background,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};

const header: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "32px",
};

const logoLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
};

const logoImage: React.CSSProperties = {
  borderRadius: "8px",
};

const logoText: React.CSSProperties = {
  marginLeft: "12px",
  fontSize: "20px",
  fontWeight: "600",
  color: colors.text,
  textDecoration: "none",
};

const content: React.CSSProperties = {
  backgroundColor: "#FBF9F7", // warm off-white
  borderRadius: "12px",
  border: `1px solid ${colors.border}`,
  padding: "32px",
};

const footer: React.CSSProperties = {
  marginTop: "32px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: colors.muted,
  margin: "0 0 16px 0",
};

const footerLinks: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: colors.muted,
  margin: "0 0 16px 0",
};

const footerLink: React.CSSProperties = {
  color: colors.primary,
  textDecoration: "underline",
};

const copyright: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "16px",
  color: colors.muted,
  margin: "0",
};

export default BaseLayout;
