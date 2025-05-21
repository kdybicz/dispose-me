import type { Request } from 'express';
import { AUTH_COOKIE_KEY, AUTH_HEADER_KEY, AUTH_QUERY_KEY } from './const';

export const normalizeUsername = (username: string): string => {
  if (!username) {
    return username;
  }

  return decodeURIComponent(username).toLowerCase().replace(/\+.*/, '').replace(/\./g, '');
};

export const parsePositiveIntOrDefault = (
  value?: string,
  defaultValue?: number,
): number | undefined => {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
};

export const getToken = (req: Request): string | null => {
  const header = req.headersDistinct?.[AUTH_HEADER_KEY];
  if (header) {
    return (Array.isArray(header) ? header[0] : header) as string;
  }

  const query = req.query?.[AUTH_QUERY_KEY];
  if (query) {
    return (Array.isArray(query) ? query[0] : query) as string;
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
