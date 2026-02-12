import { type ValidationChain, body, param, query } from 'express-validator';

import {
  AUTH_BODY_KEY,
  AUTH_QUERY_KEY,
  MAX_EMAIL_LIMIT,
  SENT_AFTER_MAX,
  SENT_AFTER_MIN,
  TOKEN_MAX_LENGTH,
  TOKEN_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from './const';
import log from './log';

let INBOX_BLACKLIST: string[] = [];
try {
  if (process.env.INBOX_BLACKLIST) {
    INBOX_BLACKLIST = process.env.INBOX_BLACKLIST.split(',');
  }
} catch (err) {
  log.error(`Unable to parse process.env.INBOX_BLACKLIST: ${process.env.INBOX_BLACKLIST}`, err);
}

const TYPE_ALLOWED_VALUES = ['html', 'json'];
export const TYPE_DEFAULT = 'html';

export const buildUsernameParamValidator = (): ValidationChain => {
  return param('username')
    .matches(/^[a-zA-Z0-9.\-_+]*$/)
    .withMessage(
      'Username may only contain letters, numbers, dots (.), hyphens (-), underscores (_), and plus signs (+).',
    )
    .toLowerCase()
    .customSanitizer((value: string) => {
      return value?.replace(/\+.*/, '')?.replace(/\./g, '') ?? '';
    })
    .isLength({ min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH })
    .withMessage(
      `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters long.`,
    )
    .not()
    .isIn(INBOX_BLACKLIST)
    .withMessage('This username is not allowed. Please choose a different one.');
};

export const buildMessageIdParamValidation = (): ValidationChain => {
  return param('id').isAlphanumeric().notEmpty();
};

export const buildSentAfterQueryValidator = (): ValidationChain => {
  return query('sentAfter').optional().toInt().isInt({ min: SENT_AFTER_MIN, max: SENT_AFTER_MAX });
};

export const buildLimitQueryValidator = (): ValidationChain => {
  return query('limit').optional().isInt({ min: 0, max: MAX_EMAIL_LIMIT }).toInt();
};

export const buildTypeQueryValidator = (): ValidationChain => {
  return query('type').optional().toLowerCase().isIn(TYPE_ALLOWED_VALUES);
};

export const buildTokenQueryValidator = (args: { required: boolean }): ValidationChain => {
  let chain = query(AUTH_QUERY_KEY);
  if (!args.required) {
    chain = chain.optional();
  }

  return chain
    .isAlphanumeric()
    .withMessage(
      `The ${AUTH_QUERY_KEY} must contain only letters and numbers (no special characters).`,
    )
    .isLength({ min: TOKEN_MIN_LENGTH, max: TOKEN_MAX_LENGTH })
    .withMessage(
      `The ${AUTH_QUERY_KEY} must be between ${TOKEN_MIN_LENGTH} and ${TOKEN_MAX_LENGTH} characters long.`,
    );
};

const isTokenValid = async (token: string): Promise<true> => {
  const url = `https://${process.env.DOMAIN_NAME}/inbox/?type=json`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': token,
      Accept: 'application/json',
    },
  });
  if (response.status === 200) {
    return true;
  }
  if (response.status === 403) {
    throw new Error('Provided token is invalid!');
  }

  log.error(
    `Unexpected issue while validating API token - ${response.status} ${response.statusText}: ${await response.text()}`,
  );
  throw new Error('Unexpected problem with validating the token!');
};

export const buildTokenBodyValidator = (): ValidationChain => {
  return body(AUTH_BODY_KEY)
    .isAlphanumeric()
    .withMessage('The token must contain only letters and numbers (no special characters).')
    .isLength({ min: TOKEN_MIN_LENGTH, max: TOKEN_MAX_LENGTH })
    .withMessage(
      `The token must be between ${TOKEN_MIN_LENGTH} and ${TOKEN_MAX_LENGTH} characters long.`,
    )
    .custom(isTokenValid);
};

export const buildRememberBodyValidator = (): ValidationChain => {
  return body('remember')
    .default('off')
    .isIn(['on', 'off'])
    .customSanitizer((value) => value === 'on');
};

export const buildFilenameQueryValidator = (): ValidationChain => {
  return query('filename').isString().notEmpty();
};

export const buildIndexValidationChain = (): ValidationChain[] => {
  return [buildTypeQueryValidator()];
};

export const buildAuthValidationChain = (): ValidationChain[] => {
  return [buildTokenBodyValidator(), buildRememberBodyValidator()];
};

export const buildLatestEmailValidationChain = (): ValidationChain[] => {
  return [
    buildUsernameParamValidator(),
    buildSentAfterQueryValidator(),
    buildTypeQueryValidator(),
    buildTokenQueryValidator({ required: false }),
  ];
};

export const buildListRssValidationChain = (): ValidationChain[] => {
  return [buildUsernameParamValidator(), buildTokenQueryValidator({ required: true })];
};

export const buildDeleteEmailValidationChain = (): ValidationChain[] => {
  return [
    buildUsernameParamValidator(),
    buildMessageIdParamValidation(),
    buildTokenQueryValidator({ required: false }),
  ];
};

export const buildDownloadEmailValidationChain = (): ValidationChain[] => {
  return [
    buildUsernameParamValidator(),
    buildMessageIdParamValidation(),
    buildTokenQueryValidator({ required: false }),
  ];
};

export const buildDownloadEmailAttachmentValidationChain = (): ValidationChain[] => {
  return [
    buildUsernameParamValidator(),
    buildMessageIdParamValidation(),
    buildTokenQueryValidator({ required: false }),
    buildFilenameQueryValidator(),
  ];
};

export const buildShowEmailValidationChain = (): ValidationChain[] => {
  return [
    buildUsernameParamValidator(),
    buildMessageIdParamValidation(),
    buildTypeQueryValidator(),
    buildTokenQueryValidator({ required: false }),
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
