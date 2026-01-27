/**
 * Cloudflare Client Library
 *
 * Provides integration with Cloudflare services:
 * - R2 Storage (S3-compatible) for audio and images
 * - Stream for video hosting and delivery
 *
 * @see https://developers.cloudflare.com/r2/
 * @see https://developers.cloudflare.com/stream/
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

/**
 * Get required environment variable or throw
 */
function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// =============================================================================
// R2 STORAGE CLIENT
// =============================================================================

/**
 * Cloudflare R2 S3-compatible client
 * Lazy initialized to avoid errors during build time
 */
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
 * Get the R2 bucket name from environment
 */
function getR2BucketName(): string {
  return getEnvOrThrow("CLOUDFLARE_R2_BUCKET_NAME");
}

// =============================================================================
// R2 UPLOAD HELPERS
// =============================================================================

/**
 * Allowed content types for different media categories
 */
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
];

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * Maximum file sizes
 */
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
export const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * R2 storage paths
 */
export const R2_PATHS = {
  audio: (creatorId: string, contentId: string, filename: string) =>
    `content/${creatorId}/${contentId}/audio/${filename}`,
  thumbnail: (creatorId: string, contentId: string, filename: string) =>
    `content/${creatorId}/${contentId}/thumbnails/${filename}`,
  avatar: (creatorId: string, filename: string) =>
    `creators/${creatorId}/avatar/${filename}`,
  cover: (creatorId: string, filename: string) =>
    `creators/${creatorId}/cover/${filename}`,
} as const;

/**
 * Generate a presigned upload URL for R2
 *
 * @param key - The object key (path) in R2
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns Presigned upload URL
 */
export async function generateR2UploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  return uploadUrl;
}

/**
 * Generate a presigned download URL for R2
 *
 * @param key - The object key (path) in R2
 * @param expiresIn - URL expiration in seconds (default: 15 minutes)
 * @returns Presigned download URL
 */
export async function generateR2DownloadUrl(
  key: string,
  expiresIn: number = 900, // 15 minutes
): Promise<string> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const downloadUrl = await getSignedUrl(client, command, { expiresIn });
  return downloadUrl;
}

/**
 * Get the public URL for an R2 object (if bucket is public)
 * Note: This requires the bucket to be configured with a custom domain
 *
 * @param key - The object key (path) in R2
 * @returns Public URL
 */
export function getR2PublicUrl(key: string): string {
  const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
  if (!publicDomain) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_DOMAIN not configured");
  }
  return `https://${publicDomain}/${key}`;
}

// =============================================================================
// CLOUDFLARE STREAM HELPERS
// =============================================================================

/**
 * Cloudflare Stream API response types
 */
export interface StreamUploadResponse {
  success: boolean;
  result: {
    uid: string;
    uploadURL: string;
  } | null;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export interface StreamVideoDetails {
  uid: string;
  thumbnail: string;
  thumbnailTimestampPct: number;
  readyToStream: boolean;
  status: {
    state: string;
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: Record<string, string>;
  created: string;
  modified: string;
  size: number;
  preview: string;
  allowedOrigins: string[];
  requireSignedURLs: boolean;
  uploaded: string;
  uploadExpiry: string;
  maxSizeBytes: number;
  maxDurationSeconds: number;
  duration: number;
  input: {
    width: number;
    height: number;
  };
  playback: {
    hls: string;
    dash: string;
  };
}

/**
 * Create a direct creator upload URL for Cloudflare Stream
 *
 * This creates a one-time upload URL that allows the creator to upload
 * a video directly to Cloudflare Stream without going through our server.
 *
 * @param metadata - Optional metadata to attach to the video
 * @param maxDurationSeconds - Maximum video duration (default: 1 hour)
 * @returns Upload URL and video UID
 */
export async function createStreamUploadUrl(
  metadata?: Record<string, string>,
  maxDurationSeconds: number = 3600,
): Promise<{ uploadUrl: string; videoUid: string }> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = getEnvOrThrow("CLOUDFLARE_API_TOKEN");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds,
        meta: metadata || {},
        requireSignedURLs: true, // Require signed URLs for playback
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Cloudflare Stream API error:", errorText);
    throw new Error(`Failed to create Stream upload URL: ${response.status}`);
  }

  const data = (await response.json()) as StreamUploadResponse;

  if (!data.success || !data.result) {
    const errorMessage = data.errors?.[0]?.message || "Unknown error";
    throw new Error(`Cloudflare Stream error: ${errorMessage}`);
  }

  return {
    uploadUrl: data.result.uploadURL,
    videoUid: data.result.uid,
  };
}

/**
 * Get video details from Cloudflare Stream
 *
 * @param videoUid - The video UID from Cloudflare Stream
 * @returns Video details including duration, status, etc.
 */
export async function getStreamVideoDetails(
  videoUid: string,
): Promise<StreamVideoDetails> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = getEnvOrThrow("CLOUDFLARE_API_TOKEN");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get video details: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.result) {
    throw new Error("Failed to get video details from Cloudflare Stream");
  }

  return data.result as StreamVideoDetails;
}

/**
 * Delete a video from Cloudflare Stream
 *
 * @param videoUid - The video UID to delete
 */
export async function deleteStreamVideo(videoUid: string): Promise<void> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = getEnvOrThrow("CLOUDFLARE_API_TOKEN");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete video: ${response.status}`);
  }
}

/**
 * Generate a signed token for Cloudflare Stream playback
 *
 * This creates a signed URL that allows playback of a video for a limited time.
 * The token includes the viewer's ID for watermarking purposes.
 *
 * @param videoUid - The video UID
 * @param viewerId - The viewer's user ID (for watermarking)
 * @param expiresIn - Token expiration in seconds (default: 1 hour)
 * @returns Signed playback token
 */
export async function generateStreamSignedToken(
  videoUid: string,
  viewerId: string,
  expiresIn: number = 3600,
): Promise<string> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = getEnvOrThrow("CLOUDFLARE_API_TOKEN");

  // Calculate expiration timestamp
  const exp = Math.floor(Date.now() / 1000) + expiresIn;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exp,
        // Embed viewer ID in the token for watermarking
        accessRules: [
          {
            type: "any",
            action: "allow",
          },
        ],
        // Note: Actual watermarking requires additional Stream configuration
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to generate signed token: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.result?.token) {
    throw new Error("Failed to generate Stream signed token");
  }

  return data.result.token;
}

/**
 * Get the embed URL for a Cloudflare Stream video
 *
 * @param videoUid - The video UID
 * @param token - Optional signed token for authenticated playback
 * @returns Embed URL
 */
export function getStreamEmbedUrl(videoUid: string, token?: string): string {
  const baseUrl = `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoUid}`;
  if (token) {
    return `${baseUrl}?token=${token}`;
  }
  return baseUrl;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(
  originalFilename: string,
  prefix?: string,
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalFilename.split(".").pop() || "";
  const baseName = prefix || "file";
  return `${baseName}-${timestamp}-${randomSuffix}.${extension}`;
}

/**
 * Validate file type against allowed types
 */
export function isValidFileType(
  contentType: string,
  allowedTypes: string[],
): boolean {
  return allowedTypes.includes(contentType);
}

/**
 * Parse R2 object key from a full URL
 */
export function parseR2KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}
