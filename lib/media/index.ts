/**
 * Media Utilities
 *
 * This module exports all media-related utilities for signed URLs,
 * content access validation, and paywall enforcement.
 *
 * @see PRD Phase 3, Task 12: Paywall Enforcement
 */

// Signed URL generation
export {
  generateSignedR2Url,
  generateSignedStreamToken,
  createUserBindingToken,
  verifyUserBindingToken,
  logMediaAccess,
  getContentTypeFromKey,
  MIN_URL_EXPIRATION,
  MAX_URL_EXPIRATION,
  DEFAULT_URL_EXPIRATION,
  type SignedMediaUrl,
  type SignedStreamToken,
  type SignedUrlOptions,
} from "./signed-urls";
