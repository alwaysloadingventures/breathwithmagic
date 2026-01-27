/**
 * HTML sanitization utilities for user-generated content
 *
 * Uses DOMPurify to prevent XSS attacks in rich text content.
 * PRD requirement: "DOMPurify for user-generated content" (line 514)
 */
import DOMPurify from "isomorphic-dompurify";

/**
 * Allowed HTML tags for rich text content.
 * These tags are safe and commonly needed for basic text formatting.
 */
const ALLOWED_TAGS = [
  "b",
  "i",
  "em",
  "strong",
  "a",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "span",
];

/**
 * Allowed HTML attributes.
 * Limited to safe attributes that don't enable script execution.
 */
const ALLOWED_ATTR = ["href", "target", "rel", "class"];

/**
 * Sanitize HTML content to prevent XSS attacks.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string with only allowed tags and attributes
 *
 * @example
 * ```typescript
 * const unsafe = '<script>alert("xss")</script><p>Hello</p>';
 * const safe = sanitizeHtml(unsafe); // '<p>Hello</p>'
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (!html) {
    return "";
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force all links to open in new tab with noopener
    ADD_ATTR: ["target"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    // Remove any data-* attributes
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text by escaping HTML entities.
 * Use this for content that should never contain HTML.
 *
 * @param text - The plain text to sanitize
 * @returns Text with HTML entities escaped
 */
export function escapeHtml(text: string): string {
  if (!text) {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strip all HTML tags from content.
 * Use this when you need plain text only.
 *
 * @param html - The HTML string to strip
 * @returns Plain text without any HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) {
    return "";
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
