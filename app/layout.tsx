import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

/**
 * Base URL for the site - used for Open Graph and canonical URLs
 * In production, this should be set via NEXT_PUBLIC_APP_URL environment variable
 */
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://breathwithmagic.com";

/**
 * Viewport configuration for mobile optimization
 *
 * - width: device-width for responsive design
 * - initialScale: 1 for proper initial zoom
 * - maximumScale: 1 prevents pinch-to-zoom issues on iOS form inputs
 * - userScalable: false prevents accidental zoom on form inputs
 * - viewportFit: cover enables safe area insets for notched phones
 * - themeColor: Matches design system for browser chrome
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf9" }, // warm off-white
    { media: "(prefers-color-scheme: dark)", color: "#1a1a18" }, // warm dark
  ],
};

/**
 * Global metadata configuration for SEO
 *
 * Provides defaults for all pages, which can be overridden
 * by individual page generateMetadata functions.
 */
export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "breathwithmagic - Find the Practice That Feels Right",
    template: "%s | breathwithmagic",
  },
  description:
    "Discover transformative breathwork, yoga, and meditation experiences from real teachers. No classes to book. No schedules to follow. Just authentic wellness practices when you need them.",
  keywords: [
    "breathwork",
    "meditation",
    "yoga",
    "wellness",
    "mindfulness",
    "stress relief",
    "sound healing",
    "somatic",
    "movement",
    "coaching",
    "sleep",
    "mental health",
    "self-care",
    "wellness creators",
  ],
  authors: [{ name: "breathwithmagic" }],
  creator: "breathwithmagic",
  publisher: "breathwithmagic",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "breathwithmagic",
    title: "breathwithmagic - Find the Practice That Feels Right",
    description:
      "Discover transformative breathwork, yoga, and meditation experiences from real teachers. Authentic wellness practices when you need them.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "breathwithmagic - Creator-First Wellness Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "breathwithmagic - Find the Practice That Feels Right",
    description:
      "Discover transformative breathwork, yoga, and meditation experiences from real teachers.",
    images: ["/opengraph-image"],
    creator: "@breathwithmagic",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
  alternates: {
    canonical: baseUrl,
  },
  category: "Health & Wellness",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "hsl(25, 30%, 45%)",
          colorBackground: "hsl(30, 20%, 98%)",
          colorText: "hsl(30, 10%, 15%)",
          colorTextSecondary: "hsl(30, 10%, 45%)",
          colorInputBackground: "hsl(30, 20%, 98%)",
          colorInputText: "hsl(30, 10%, 15%)",
          fontFamily: "Inter, sans-serif",
          borderRadius: "0.75rem",
        },
        elements: {
          formButtonPrimary:
            "bg-[hsl(25,30%,45%)] hover:bg-[hsl(25,30%,40%)] text-white",
          card: "shadow-md",
          headerTitle: "text-[hsl(30,10%,15%)]",
          headerSubtitle: "text-[hsl(30,10%,45%)]",
          socialButtonsBlockButton:
            "border-[hsl(30,15%,88%)] hover:bg-[hsl(35,25%,90%)]",
          formFieldLabel: "text-[hsl(30,10%,15%)]",
          formFieldInput:
            "border-[hsl(30,15%,88%)] focus:border-[hsl(25,30%,45%)] focus:ring-[hsl(25,30%,45%)]",
          footerActionLink:
            "text-[hsl(25,30%,45%)] hover:text-[hsl(25,30%,40%)]",
        },
      }}
    >
      <html lang="en">
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
