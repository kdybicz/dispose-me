import { DAYS_TO_MS_MULTIPLIER, DEFAULT_COOKIE_TTL_DAYS } from './const';

export const parseCookieTtlDays = (): number => {
  const raw = process.env.COOKIE_TTL_DAYS;

  if (raw === undefined || raw === '') {
    return DEFAULT_COOKIE_TTL_DAYS;
  }

  const days = Number(raw);

  if (Number.isNaN(days) || !Number.isInteger(days)) {
    return DEFAULT_COOKIE_TTL_DAYS;
  }

  if (days < 1) {
    return 1;
  }
  if (days > 365) {
    return 365;
  }
  return days;
};

export const getCookieMaxAgeMs = (): number => parseCookieTtlDays() * DAYS_TO_MS_MULTIPLIER;
