/**
 * HTML sanitization utilities for user-generated content
 *
 * Uses DOMPurify to prevent XSS attacks in rich text content.
 * Uses linkify-html to auto-convert plain text URLs to clickable links.
 * PRD requirement: "DOMPurify for user-generated content" (line 514)
 */
import DOMPurify from "isomorphic-dompurify";
import linkifyHtml from "linkify-html";

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
 * Configure DOMPurify hook to add target="_blank" and rel="noopener noreferrer"
 * to all anchor tags for security and proper external link handling.
 */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Sanitize HTML content to prevent XSS attacks.
 *
 * Auto-links plain text URLs (e.g., https://example.com) to clickable links
 * before sanitization, ensuring they work alongside manually written <a> tags.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string with only allowed tags and attributes
 *
 * @example
 * ```typescript
 * const unsafe = '<script>alert("xss")</script><p>Hello</p>';
 * const safe = sanitizeHtml(unsafe); // '<p>Hello</p>'
 *
 * const withUrl = '<p>Check out https://example.com for more</p>';
 * const linked = sanitizeHtml(withUrl);
 * // '<p>Check out <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a> for more</p>'
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (!html) {
    return "";
  }

  // First, auto-link plain text URLs to make them clickable
  // This converts "https://example.com" to proper anchor tags
  const linked = linkifyHtml(html, {
    defaultProtocol: "https",
    target: "_blank",
    rel: "noopener noreferrer",
  });

  // Then sanitize the HTML to remove any malicious content
  return DOMPurify.sanitize(linked, {
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
