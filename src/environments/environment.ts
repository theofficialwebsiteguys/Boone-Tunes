export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001',
  // Tracks ahead of the current one to silently resolve in the background
  // (current + next N). Keep in sync with the backend's YOUTUBE_PREFETCH_COUNT default.
  youtubePrefetchCount: 2,
};
