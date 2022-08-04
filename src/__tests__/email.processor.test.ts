// import { S3Event } from 'aws-lambda';
// import { handler } from '../email-processor';
import * as fs from 'fs';

import { simpleParser } from 'mailparser';
import { parse as parseEmailAddress } from 'address-rfc2822';

describe('Email Processor', () => {
  test('Parse email body', async () => {
    // given:
    const email = await fs.readFileSync(`${__dirname}/simple.eml`).toString();

    // when:
    const result = await simpleParser(email);
    // then:
    expect(result.from.text).toEqual('Kamil Dybicz <kamil@secretescapes.com>');
  });

  test('Parse single email', () => {
    // given:
    const emailString = 'John Doe <john.doe@test.com>';

    // when:
    const result = parseEmailAddress(emailString);
    // then:
    expect(result[0].user()).toEqual('john.doe');
  });

  test('First test', async () => {
    // given:
    // const event = {} as S3Event;

    // when:
    // const result = await handler(event, null, null);
    // then:
    // expect(result).toEqual({});
    expect(true).toBeTruthy();
  });
});
