/**
 * Get the base URL for the application (handles GitHub Pages subdirectory)
 */
export const getBaseUrl = (): string => {
  return import.meta.env.BASE_URL;
};

/**
 * Get a public asset path (from public/ folder) with correct base URL
 * @param path - Path relative to public folder (e.g., '/images/logo.png')
 * @returns Full path with base URL (e.g., '/various-facets-of-life/images/logo.png')
 */
export const getPublicPath = (path: string): string => {
  const base = getBaseUrl();
  // Remove leading slash from path if present, then combine with base
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Ensure base ends with / and path doesn't start with /
  return `${base}${base.endsWith('/') ? '' : '/'}${cleanPath}`;
};


