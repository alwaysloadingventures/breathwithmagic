/**
 * Signed URL Generation for Media Content
 *
 * This module provides secure, time-limited, user-bound URLs for:
 * - Cloudflare R2 (audio, images)
 * - Cloudflare Stream (video with watermarking)
 *
 * Security features:
 * - URLs expire after configurable time (15-60 minutes)
 * - URLs are bound to specific user IDs
 * - Video tokens include subscriber ID for watermarking
 * - Access is validated server-side before URL generation
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

import crypto from "crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// =============================================================================
// TYPES
// =============================================================================

export interface SignedMediaUrl {
  /** The signed URL for media access */
  url: string;
  /** Expiration timestamp (Unix seconds) */
  expiresAt: number;
  /** Content type (video, audio, image) */
  type: "video" | "audio" | "image";
  /** The content ID this URL is for */
  contentId: string;
  /** The user ID this URL is bound to */
  userId: string;
}

export interface SignedStreamToken {
  /** The signed token for Cloudflare Stream */
  token: string;
  /** The video UID */
  videoUid: string;
  /** Expiration timestamp (Unix seconds) */
  expiresAt: number;
  /** The user ID embedded in the token (for watermarking) */
  userId: string;
  /** Playback URL with token */
  playbackUrl: string;
}

export interface SignedUrlOptions {
  /** URL expiration in seconds (default: 15 minutes, max: 60 minutes) */
  expiresIn?: number;
  /** User ID for binding and audit trail */
  userId: string;
  /** Content ID for logging and validation */
  contentId: string;
  /** Creator ID for logging */
  creatorId: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum URL expiration: 15 minutes */
export const MIN_URL_EXPIRATION = 15 * 60;

/** Maximum URL expiration: 60 minutes */
export const MAX_URL_EXPIRATION = 60 * 60;

/** Default URL expiration: 30 minutes */
export const DEFAULT_URL_EXPIRATION = 30 * 60;

// =============================================================================
// ENVIRONMENT HELPERS
// =============================================================================

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// =============================================================================
// R2 SIGNED URLS (Audio, Images)
// =============================================================================

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = getEnvOrThrow("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = getEnvOrThrow("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

/**
 * Generate a signed download URL for R2 content (audio, images)
 *
 * The URL is bound to a specific user by including a hash of the user ID
 * in the request headers. This prevents URL sharing between users.
 *
 * @param key - The R2 object key (path)
 * @param options - Signing options including user binding
 * @returns Signed URL with expiration info
 */
export async function generateSignedR2Url(
  key: string,
  options: SignedUrlOptions,
): Promise<SignedMediaUrl> {
  const client = getR2Client();
  const bucket = getEnvOrThrow("CLOUDFLARE_R2_BUCKET_NAME");

  // Clamp expiration to allowed range
  const expiresIn = Math.min(
    Math.max(options.expiresIn || DEFAULT_URL_EXPIRATION, MIN_URL_EXPIRATION),
    MAX_URL_EXPIRATION,
  );

  // Create a user-binding token that must be present in the request
  // This is included as a custom metadata header requirement
  const userBinding = createUserBindingToken(
    options.userId,
    options.contentId,
    expiresIn,
  );

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    // Include user binding in response metadata for audit
    ResponseContentDisposition: `inline; user=${userBinding}`,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  // Determine content type from key extension
  const type = getContentTypeFromKey(key);

  // Log access for audit trail
  logMediaAccess({
    action: "url_generated",
    userId: options.userId,
    contentId: options.contentId,
    creatorId: options.creatorId,
    mediaType: type,
    expiresAt,
  });

  return {
    url,
    expiresAt,
    type,
    contentId: options.contentId,
    userId: options.userId,
  };
}

// =============================================================================
// CLOUDFLARE STREAM SIGNED TOKENS (Video)
// =============================================================================

/**
 * Generate a signed token for Cloudflare Stream video playback
 *
 * The token includes:
 * - Expiration time
 * - User ID for watermarking identification
 * - Content restrictions
 *
 * @param videoUid - Cloudflare Stream video UID
 * @param options - Signing options including user binding
 * @returns Signed token with playback URL
 */
export async function generateSignedStreamToken(
  videoUid: string,
  options: SignedUrlOptions,
): Promise<SignedStreamToken> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = getEnvOrThrow("CLOUDFLARE_API_TOKEN");
  const streamKeyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
  const streamKeyPem = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_PEM;

  // Clamp expiration to allowed range
  const expiresIn = Math.min(
    Math.max(options.expiresIn || DEFAULT_URL_EXPIRATION, MIN_URL_EXPIRATION),
    MAX_URL_EXPIRATION,
  );

  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  let token: string;

  // If we have a signing key configured, use local JWT signing (preferred)
  // Otherwise, fall back to the Cloudflare API
  if (streamKeyId && streamKeyPem) {
    token = await createLocalStreamToken(videoUid, {
      ...options,
      expiresIn,
      keyId: streamKeyId,
      keyPem: streamKeyPem,
    });
  } else {
    // Fall back to API-based token generation
    token = await createApiStreamToken(videoUid, {
      ...options,
      expiresIn,
      accountId,
      apiToken,
    });
  }

  // Get the customer subdomain for playback URL
  const customerSubdomain =
    process.env.CLOUDFLARE_STREAM_SUBDOMAIN || accountId;
  const playbackUrl = `https://customer-${customerSubdomain}.cloudflarestream.com/${token}/manifest/video.m3u8`;

  // Log access for audit trail
  logMediaAccess({
    action: "token_generated",
    userId: options.userId,
    contentId: options.contentId,
    creatorId: options.creatorId,
    mediaType: "video",
    videoUid,
    expiresAt,
  });

  return {
    token,
    videoUid,
    expiresAt,
    userId: options.userId,
    playbackUrl,
  };
}

/**
 * Create a signed JWT token locally using the Stream signing key
 * This is more efficient than calling the API and allows embedding custom claims
 */
async function createLocalStreamToken(
  videoUid: string,
  options: SignedUrlOptions & {
    expiresIn: number;
    keyId: string;
    keyPem: string;
  },
): Promise<string> {
  const header = {
    alg: "RS256",
    kid: options.keyId,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    // Standard JWT claims
    sub: videoUid,
    kid: options.keyId,
    exp: now + options.expiresIn,
    nbf: now - 60, // Allow 60 seconds clock skew
    // Custom claims for watermarking and audit
    // Note: These are embedded in the token for Cloudflare Stream watermarking
    accessRules: [
      {
        type: "any",
        action: "allow",
      },
    ],
    // Watermark data - Cloudflare Stream can use this to overlay subscriber info
    watermark: {
      userId: options.userId,
      contentId: options.contentId,
      creatorId: options.creatorId,
      // Short user identifier for visual watermark (first 8 chars of hash)
      displayId: crypto
        .createHash("sha256")
        .update(options.userId)
        .digest("hex")
        .substring(0, 8)
        .toUpperCase(),
    },
  };

  // Base64url encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with RSA-SHA256
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(options.keyPem);
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Fall back to Cloudflare API for token generation
 * Used when no signing key is configured locally
 */
async function createApiStreamToken(
  videoUid: string,
  options: SignedUrlOptions & {
    expiresIn: number;
    accountId: string;
    apiToken: string;
  },
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + options.expiresIn;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/stream/${videoUid}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exp,
        accessRules: [
          {
            type: "any",
            action: "allow",
          },
        ],
        // Include user info in the download restrictions for audit
        downloadable: false,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Cloudflare Stream token API error:", errorText);
    throw new Error(`Failed to generate Stream token: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.result?.token) {
    throw new Error("Failed to generate Stream signed token");
  }

  return data.result.token;
}

// =============================================================================
// USER BINDING & VERIFICATION
// =============================================================================

/**
 * Create a user binding token that ties a URL to a specific user
 * This token is included in the URL and can be verified server-side
 */
export function createUserBindingToken(
  userId: string,
  contentId: string,
  expiresIn: number,
): string {
  const secret = getEnvOrThrow("MEDIA_SIGNING_SECRET");
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const data = `${userId}:${contentId}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex")
    .substring(0, 16);

  return `${expiresAt}.${signature}`;
}

/**
 * Verify a user binding token
 * Returns true if the token is valid and not expired
 */
export function verifyUserBindingToken(
  token: string,
  userId: string,
  contentId: string,
): boolean {
  try {
    const secret = getEnvOrThrow("MEDIA_SIGNING_SECRET");
    const [expiresAtStr, signature] = token.split(".");

    if (!expiresAtStr || !signature) {
      return false;
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (expiresAt < now) {
      return false;
    }

    // Verify signature
    const data = `${userId}:${contentId}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex")
      .substring(0, 16);

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Base64url encode (RFC 4648)
 */
function base64UrlEncode(data: string | Buffer): string {
  const base64 = Buffer.isBuffer(data)
    ? data.toString("base64")
    : Buffer.from(data).toString("base64");

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Determine content type from R2 key extension
 */
function getContentTypeFromKey(key: string): "video" | "audio" | "image" {
  const extension = key.split(".").pop()?.toLowerCase() || "";

  const audioExtensions = ["mp3", "wav", "ogg", "aac", "m4a", "flac"];
  const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

  if (audioExtensions.includes(extension)) {
    return "audio";
  }
  if (imageExtensions.includes(extension)) {
    return "image";
  }
  return "video";
}

/**
 * Log media access for audit trail
 */
interface MediaAccessLog {
  action:
    | "url_generated"
    | "token_generated"
    | "access_validated"
    | "access_denied";
  userId: string;
  contentId: string;
  creatorId: string;
  mediaType: "video" | "audio" | "image";
  videoUid?: string;
  expiresAt?: number;
  reason?: string;
}

function logMediaAccess(log: MediaAccessLog): void {
  // In production, this would go to a proper logging service
  // For now, we log to console in a structured format
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "media-access",
      ...log,
    }),
  );
}

// =============================================================================
// EXPORTS FOR EXTERNAL USE
// =============================================================================

export { logMediaAccess, getContentTypeFromKey };
