/**
 * Content & Program Validation Schemas
 *
 * Zod schemas for validating content and program data
 */
import { z } from "zod";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

export const contentTypeSchema = z.enum(["video", "audio", "text"]);

export const contentStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
  "deleted",
]);

// =============================================================================
// CONTENT SCHEMAS
// =============================================================================

/**
 * Schema for creating new content
 */
export const createContentSchema = z.object({
  type: contentTypeSchema,
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim(),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or less")
    .optional()
    .nullable(),
  mediaUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duration: z
    .number()
    .int()
    .min(0, "Duration must be positive")
    .optional()
    .nullable(),
  isFree: z.boolean().default(false),
  status: contentStatusSchema.default("draft"),
  programId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
});

/**
 * Schema for updating existing content
 */
export const updateContentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim()
    .optional(),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or less")
    .optional()
    .nullable(),
  mediaUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duration: z
    .number()
    .int()
    .min(0, "Duration must be positive")
    .optional()
    .nullable(),
  isFree: z.boolean().optional(),
  status: contentStatusSchema.optional(),
  programId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
});

/**
 * Schema for publishing content
 * Ensures required fields are present before publishing
 */
export const publishContentSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    // For video/audio, mediaUrl and duration are required
    // For text, neither is required
  })
  .passthrough();

/**
 * Content list query parameters
 */
export const contentListQuerySchema = z.object({
  status: contentStatusSchema.optional(),
  type: contentTypeSchema.optional(),
  programId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// PROGRAM SCHEMAS
// =============================================================================

/**
 * Schema for creating a new program
 */
export const createProgramSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  isFree: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

/**
 * Schema for updating an existing program
 */
export const updateProgramSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  isFree: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  publishedAt: z.coerce.date().optional().nullable(),
});

/**
 * Schema for reordering content within a program
 */
export const reorderProgramContentSchema = z.object({
  contentIds: z
    .array(z.string().cuid())
    .min(1, "At least one content ID is required"),
});

/**
 * Program list query parameters
 */
export const programListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeContent: z.coerce.boolean().default(false),
});

// =============================================================================
// UPLOAD URL SCHEMAS
// =============================================================================

/**
 * Allowed audio MIME types
 */
export const audioMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
] as const;

/**
 * Allowed image MIME types
 */
export const imageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Schema for requesting an audio upload URL
 */
export const audioUploadUrlSchema = z.object({
  contentId: z.string().cuid(),
  filename: z.string().min(1, "Filename is required"),
  contentType: z.enum(audioMimeTypes, {
    message: "Invalid audio format. Supported formats: MP3, WAV, OGG, AAC, M4A",
  }),
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(100 * 1024 * 1024, "Audio file must be 100MB or less"),
});

/**
 * Schema for requesting an image/thumbnail upload URL
 */
export const imageUploadUrlSchema = z.object({
  contentId: z.string().cuid().optional(), // Optional for creator profile images
  filename: z.string().min(1, "Filename is required"),
  contentType: z.enum(imageMimeTypes, {
    message: "Invalid image format. Supported formats: JPEG, PNG, WebP, GIF",
  }),
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(2 * 1024 * 1024, "Image file must be 2MB or less"),
  purpose: z.enum(["thumbnail", "avatar", "cover"]).default("thumbnail"),
});

/**
 * Schema for requesting a video upload URL (Cloudflare Stream)
 */
export const videoUploadUrlSchema = z.object({
  contentId: z.string().cuid(),
  maxDurationSeconds: z
    .number()
    .int()
    .min(1)
    .max(21600) // 6 hours max
    .default(3600), // 1 hour default
});

// =============================================================================
// RICH TEXT SCHEMA
// =============================================================================

/**
 * Schema for rich text content (text posts)
 * Basic validation - actual sanitization happens server-side
 */
export const richTextContentSchema = z
  .string()
  .max(50000, "Content is too long")
  .refine(
    (val) => {
      // Basic check that it's not just whitespace
      return val.trim().length > 0;
    },
    { message: "Content cannot be empty" },
  );

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ContentType = z.infer<typeof contentTypeSchema>;
export type ContentStatus = z.infer<typeof contentStatusSchema>;
export type CreateContent = z.infer<typeof createContentSchema>;
export type UpdateContent = z.infer<typeof updateContentSchema>;
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;

export type CreateProgram = z.infer<typeof createProgramSchema>;
export type UpdateProgram = z.infer<typeof updateProgramSchema>;
export type ReorderProgramContent = z.infer<typeof reorderProgramContentSchema>;
export type ProgramListQuery = z.infer<typeof programListQuerySchema>;

export type AudioUploadUrlRequest = z.infer<typeof audioUploadUrlSchema>;
export type ImageUploadUrlRequest = z.infer<typeof imageUploadUrlSchema>;
export type VideoUploadUrlRequest = z.infer<typeof videoUploadUrlSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if content is ready to be published
 */
export function canPublishContent(content: {
  type: ContentType;
  title: string;
  mediaUrl: string | null;
  duration: number | null;
}): { canPublish: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content.title || content.title.trim().length === 0) {
    errors.push("Title is required");
  }

  if (content.type === "video" || content.type === "audio") {
    if (!content.mediaUrl) {
      errors.push(
        `${content.type === "video" ? "Video" : "Audio"} file is required`,
      );
    }
    if (!content.duration || content.duration <= 0) {
      errors.push("Duration is required for media content");
    }
  }

  return {
    canPublish: errors.length === 0,
    errors,
  };
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get content type icon name
 */
export function getContentTypeIcon(type: ContentType): string {
  switch (type) {
    case "video":
      return "Video";
    case "audio":
      return "Headphones";
    case "text":
      return "FileText";
    default:
      return "File";
  }
}

/**
 * Get content status badge variant
 */
export function getContentStatusVariant(
  status: ContentStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    case "deleted":
      return "destructive";
    default:
      return "secondary";
  }
}
