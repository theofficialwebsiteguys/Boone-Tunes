// ─────────────────────────────────────────────────────────────────────────────
// Production / GitHub Pages environment
//
// Set BOONE_API_URL to your Heroku app URL, e.g.:
//   https://your-app-name.herokuapp.com
//
// Used by: ng build --configuration=production
// ─────────────────────────────────────────────────────────────────────────────
export const environment = {
  production: true,
  apiUrl: 'https://boone-tunes-api-9da7fc53f03b.herokuapp.com',
  youtubePrefetchCount: 2,
};
