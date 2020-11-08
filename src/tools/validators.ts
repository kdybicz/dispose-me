import { Schema } from 'express-validator';

import { normalizeUsername } from '../tools/utils';

export const requestSchema: Schema = {
  username: {
    in: ['query'],
    errorMessage: 'Username is missing',
    isString: true,
    notEmpty: true,
    customSanitizer: {
      options: normalizeUsername,
    },
  },
  sentAfter: {
    in: ['query'],
    errorMessage: 'Value is missing',
    optional: true,
    isString: true,
    isNumeric: true,
  },
  limit: {
    in: ['query'],
    errorMessage: 'Value is missing',
    optional: true,
    isInt: {
      options: { gt: 0, lt: 50 },
      errorMessage: 'Value should be between 1 and 60',
    },
    toInt: true,
  },
};
