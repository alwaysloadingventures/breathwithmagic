import { ImageResponse } from "next/og";

/**
 * Default Open Graph image for breathwithmagic
 *
 * This image is used as the default social sharing image across the platform.
 * It uses the warm neutral design system colors from the PRD:
 * - Primary: hsl(25, 30%, 45%) - terracotta (#9a7b6a)
 * - Background: hsl(30, 20%, 98%) - warm off-white (#fdfbf9)
 * - Muted: hsl(30, 15%, 94%) - soft warm gray (#f3f0ed)
 * - Accent: hsl(35, 25%, 90%) - warm cream (#ede7df)
 *
 * Dimensions: 1200x630 (standard OG image size)
 */

export const runtime = "edge";

export const alt = "breathwithmagic - Find the Practice That Feels Right";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Warm off-white background
          background: "linear-gradient(135deg, #fdfbf9 0%, #ede7df 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Decorative background elements */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            // Terracotta with transparency
            background: "rgba(154, 123, 106, 0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            // Accent cream with transparency
            background: "rgba(237, 231, 223, 0.5)",
          }}
        />

        {/* Logo/Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            // Terracotta primary color
            background: "#9a7b6a",
            marginBottom: "32px",
          }}
        >
          {/* Simple breath symbol */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            style={{ color: "#fdfbf9" }}
          >
            <circle
              cx="24"
              cy="24"
              r="18"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M24 6v36M6 24h36"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.3"
            />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            // Warm dark gray foreground
            color: "#2d2925",
            letterSpacing: "-0.02em",
            marginBottom: "16px",
          }}
        >
          breathwithmagic
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 400,
            // Medium warm gray
            color: "#6d6358",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Find the practice that feels right.
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: "20px",
            fontWeight: 400,
            // Lighter warm gray
            color: "#8a837a",
            textAlign: "center",
            maxWidth: "700px",
            marginTop: "24px",
            lineHeight: 1.5,
          }}
        >
          Breathwork, meditation, and movement from real teachers.
          <br />
          No classes to book. No schedules to follow.
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "8px",
            // Terracotta gradient
            background: "linear-gradient(90deg, #9a7b6a 0%, #b8998a 50%, #9a7b6a 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
