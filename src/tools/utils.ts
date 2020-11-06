import { escape } from 'querystring';

export const normalizeUsername = (name: string): string => {
  const stripped = name
    .toLowerCase()
    .replace(/\+.*/, '')
    .replace(/\./g, '');

  return escape(stripped);
};
