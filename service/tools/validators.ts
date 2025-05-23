import { type ValidationChain, body, param, query } from 'express-validator';

import log from './log';

let INBOX_BLACKLIST: string[] = [];
try {
  if (process.env.INBOX_BLACKLIST) {
    INBOX_BLACKLIST = process.env.INBOX_BLACKLIST.split(',');
  }
} catch (err) {
  log.error(`Unable to parse process.env.INBOX_BLACKLIST: ${process.env.INBOX_BLACKLIST}`, err);
}

const ALLOWED_TYPES = ['html', 'json'];
export const DEFAULT_TYPE = 'html';

export const buildUsernameParamValidator = (): ValidationChain => {
  return param('username')
    .matches(/[a-zA-Z0-9.\-_+]*/)
    .toLowerCase()
    .customSanitizer((value: string) => {
      return value?.replace(/\+.*/, '')?.replace(/\./g, '') ?? '';
    })
    .isLength({ min: 3, max: 25 })
    .not()
    .isIn(INBOX_BLACKLIST);
};

export const buildMessageIdParamValidation = (): ValidationChain => {
  return param('id').isAlphanumeric().notEmpty();
};

export const buildSentAfterQueryValidator = (): ValidationChain => {
  return query('sentAfter').optional().toInt().isInt({ min: 0, max: 9999999999 });
};

export const buildLimitQueryValidator = (): ValidationChain => {
  return query('limit').optional().isInt({ min: 0, max: 100 }).toInt();
};

export const buildTypeQueryValidator = (): ValidationChain => {
  return query('type').default(DEFAULT_TYPE).toLowerCase().isIn(ALLOWED_TYPES);
};

export const buildTokenBodyValidator = (): ValidationChain => {
  return body('token').isAlphanumeric();
};

export const buildRememberBodyValidator = (): ValidationChain => {
  return body('remember')
    .default('off')
    .isIn(['on', 'off'])
    .customSanitizer((value) => value === 'on');
};

export const buildIndexValidationChain = (): ValidationChain[] => {
  return [buildTypeQueryValidator()];
};

export const buildAuthValidationChain = (): ValidationChain[] => {
  return [buildTokenBodyValidator(), buildRememberBodyValidator()];
};

export const buildLatestEmailValidationChain = (): ValidationChain[] => {
  return [buildUsernameParamValidator(), buildSentAfterQueryValidator(), buildTypeQueryValidator()];
};

export const buildListRssValidationChain = (): ValidationChain[] => {
  return [buildUsernameParamValidator()];
};

export const buildDeleteEmailValidationChain = (): ValidationChain[] => {
  return [buildUsernameParamValidator(), buildMessageIdParamValidation()];
};

export const buildDownloadEmailValidationChain = (): ValidationChain[] => {
  return [buildUsernameParamValidator(), buildMessageIdParamValidation()];
};

export const buildShowEmailValidationChain = (): ValidationChain[] => {
  return [
    buildUsernameParamValidator(),
    buildMessageIdParamValidation(),
    buildTypeQueryValidator(),
  ];
};

export const buildListEmailsValidationChain = (): ValidationChain[] => {
  return [
    buildUsernameParamValidator(),
    buildSentAfterQueryValidator(),
    buildTypeQueryValidator(),
    buildLimitQueryValidator(),
  ];
};

export const buildInboxValidationChain = (): ValidationChain[] => {
  return [buildTypeQueryValidator()];
};
