import { Schema } from 'express-validator';

import { normalizeUsername } from '../tools/utils';

export const requestSchema: Schema = {
  query: {
    in: ['query'],
    errorMessage: 'Query is missing',
    isString: true,
    notEmpty: true,
    customSanitizer: {
      options: normalizeUsername,
    },
  },
  sentAfter: {
    in: ['query'],
    optional: true,
    isString: true,
    isNumeric: true,
    errorMessage: 'sentAfter is not a numeric date representation',
  },
  limit: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { gt: 0, lt: 50 },
      errorMessage: 'Value should be between 1 and 60',
    },
    toInt: true,
  },
  type: {
    in: ['query'],
    optional: true,
    isString: true,
    isIn: {
      options: [['json', 'html']],
    },
  },
};
