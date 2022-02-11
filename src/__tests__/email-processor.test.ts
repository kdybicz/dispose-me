// import { S3Event } from 'aws-lambda';
// import { handler } from '../email-processor';
import * as fs from 'fs';

import { simpleParser } from 'mailparser';
import { parse as parseEmailAddress } from 'address-rfc2822';

describe('Email Processor', () => {
  test('Parse simple email body', async () => {
    // given:
    const email = await fs.readFileSync(`${__dirname}/data/simple.eml`).toString();

    // when:
    const result = await simpleParser(email);
    // then:
    expect(result?.from?.text).toEqual('John Doe <john.doe@example.com>');
  });

  test('Parse cc email', async () => {
    // given:
    const email = await fs.readFileSync(`${__dirname}/data/cc.eml`).toString();

    // when:
    const result = await simpleParser(email);
    // then:
    expect(result?.from?.text).toEqual('John Doe <john.doe@example.com>');
  });

  test('Parse bcc email', async () => {
    // given:
    const email = await fs.readFileSync(`${__dirname}/data/bcc.eml`).toString();

    // when:
    const result = await simpleParser(email);
    // then:
    expect(result?.from?.text).toEqual('John Doe <john.doe@example.com>');
  });

  test('Parse single email', () => {
    // given:
    const emailString = 'John Doe <john.doe@test.com>';

    // when:
    const result = parseEmailAddress(emailString);
    // then:
    expect(result[0].user()).toEqual('john.doe');
  });
});
