/**
 * IMPORTANT:
 * For debugging/consistency, we intentionally do NOT rewrite any remote image URLs.
 * If the master sheet provides a CloudFront URL, the app must request that exact URL.
 */

export function normalizeRemoteImageUri(input) {
  if (input == null) return '';
  return String(input);
}

