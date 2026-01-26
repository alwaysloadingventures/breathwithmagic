import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "breathwithmagic - Creator-First Wellness Platform",
  description:
    "Discover transformative breathwork, yoga, and meditation experiences from world-class wellness creators.",
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
