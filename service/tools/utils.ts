import type { Request } from 'express';

import { AUTH_COOKIE_KEY, AUTH_HEADER_KEY, AUTH_QUERY_KEY } from './const';

/**
 * @deprecated The method should be removed
 */
export const normalizeUsername = (username: string): string => {
  if (!username) {
    return username;
  }

  return decodeURIComponent(username).toLowerCase().replace(/\+.*/, '').replace(/\./g, '');
};

export const getToken = (req: Request): string | null => {
  const header = req.headersDistinct?.[AUTH_HEADER_KEY];
  if (Array.isArray(header) && header.length > 0) {
    return header[0];
  }

  const query = req.query?.[AUTH_QUERY_KEY];
  if (query) {
    return (Array.isArray(query) && query.length > 0 ? query[0] : query) as string;
  }

  return getCookie(req, AUTH_COOKIE_KEY);
};

export const getCookie = (req: Request, name: string): string | null => {
  if (req.headers?.cookie) {
    return (
      `${req.headers.cookie}`
        .split(';')
        .find((cookie: string) => {
          return cookie.trim().toLowerCase().startsWith(`${name.toLowerCase()}=`);
        })
        ?.split('=')?.[1]
        ?.trim() ?? null
    );
  }

  return null;
};
