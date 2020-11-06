export const normalizeUsername = (name: string): string => name
  .toLowerCase()
  .replace(/\+.*/, '')
  .replace(/\./, '');
