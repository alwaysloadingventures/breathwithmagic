import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

/**
 * Dynamic Open Graph image for creator profiles
 *
 * Generates a personalized social sharing image for each creator featuring:
 * - Creator's display name
 * - Category/practice type
 * - Platform branding
 *
 * Uses the warm neutral design system colors from the PRD.
 */

export const runtime = "edge";

export const alt = "Creator Profile on breathwithmagic";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

/**
 * Category display labels for the OG image
 */
const CATEGORY_LABELS: Record<string, string> = {
  Breathwork: "Breathwork",
  Yoga: "Yoga",
  Meditation: "Meditation",
  Mindfulness: "Mindfulness",
  Somatic: "Somatic",
  SoundHealing: "Sound Healing",
  Movement: "Movement",
  Coaching: "Coaching",
  Sleep: "Sleep",
  StressRelief: "Stress Relief",
};

interface ImageProps {
  params: Promise<{ creatorHandle: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { creatorHandle } = await params;

  // Fetch creator data
  const creator = await prisma.creatorProfile.findFirst({
    where: {
      handle: creatorHandle,
      status: "active",
    },
    select: {
      displayName: true,
      bio: true,
      category: true,
      isVerified: true,
      _count: {
        select: {
          subscriptions: {
            where: { status: { in: ["active", "trialing"] } },
          },
          content: {
            where: { status: "published" },
          },
        },
      },
    },
  });

  // If creator not found, return default image
  if (!creator) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #fdfbf9 0%, #ede7df 100%)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: 600,
              color: "#2d2925",
            }}
          >
            Creator not found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const categoryLabel = CATEGORY_LABELS[creator.category] || creator.category;

  // Truncate bio for display
  const shortBio = creator.bio
    ? creator.bio.length > 100
      ? `${creator.bio.slice(0, 97)}...`
      : creator.bio
    : `${categoryLabel} creator on breathwithmagic`;

  // Generate initials for avatar placeholder
  const initials = creator.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #fdfbf9 0%, #ede7df 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "60px",
        }}
      >
        {/* Decorative background elements */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "rgba(154, 123, 106, 0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(237, 231, 223, 0.5)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            gap: "48px",
          }}
        >
          {/* Avatar placeholder */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "200px",
              height: "200px",
              borderRadius: "100px",
              background: "linear-gradient(135deg, #9a7b6a 0%, #b8998a 100%)",
              boxShadow: "0 20px 40px rgba(154, 123, 106, 0.2)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "72px",
                fontWeight: 600,
                color: "#fdfbf9",
              }}
            >
              {initials}
            </span>
          </div>

          {/* Creator info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* Category badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  color: "#9a7b6a",
                  background: "rgba(154, 123, 106, 0.12)",
                  padding: "8px 20px",
                  borderRadius: "24px",
                }}
              >
                {categoryLabel}
              </span>
              {creator.isVerified && (
                <span
                  style={{
                    marginLeft: "12px",
                    fontSize: "20px",
                    fontWeight: 500,
                    color: "#9a7b6a",
                  }}
                >
                  Verified
                </span>
              )}
            </div>

            {/* Creator name */}
            <div
              style={{
                fontSize: "56px",
                fontWeight: 700,
                color: "#2d2925",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginBottom: "16px",
              }}
            >
              {creator.displayName}
            </div>

            {/* Bio */}
            <div
              style={{
                fontSize: "24px",
                fontWeight: 400,
                color: "#6d6358",
                lineHeight: 1.4,
                marginBottom: "24px",
              }}
            >
              {shortBio}
            </div>

            {/* Stats */}
            <div
              style={{
                display: "flex",
                gap: "32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    color: "#2d2925",
                  }}
                >
                  {creator._count.subscriptions}
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    color: "#8a837a",
                  }}
                >
                  subscribers
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    color: "#2d2925",
                  }}
                >
                  {creator._count.content}
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    color: "#8a837a",
                  }}
                >
                  posts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(154, 123, 106, 0.2)",
            paddingTop: "24px",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#9a7b6a",
            }}
          >
            breathwithmagic
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "#8a837a",
            }}
          >
            breathwithmagic.com/{creatorHandle}
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "6px",
            background:
              "linear-gradient(90deg, #9a7b6a 0%, #b8998a 50%, #9a7b6a 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
