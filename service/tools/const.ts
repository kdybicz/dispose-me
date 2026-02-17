const AUTH_KEY = 'x-api-key';
export const AUTH_COOKIE_KEY = AUTH_KEY;
export const REMEMBER_COOKIE_KEY = 'remember';
export const AUTH_QUERY_KEY = AUTH_KEY;
export const AUTH_HEADER_KEY = AUTH_KEY;
export const AUTH_BODY_KEY = 'token';

// Database constants
export const TABLE_NAME = 'dispose-me';
export const EMAIL_TTL_DAYS = 1;
export const DEFAULT_EMAIL_LIMIT = 10;
export const MAX_EMAIL_LIMIT = 100;

// Cookie constants
export const DEFAULT_COOKIE_TTL_DAYS = 30;
export const DAYS_TO_MS_MULTIPLIER = 24 * 60 * 60 * 1000;

// Validation constants
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 25;
export const TOKEN_MIN_LENGTH = 20;
export const TOKEN_MAX_LENGTH = 50;
export const SENT_AFTER_MIN = 0;
export const SENT_AFTER_MAX = 9999999999;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT_MS = 5000; // 5 seconds
