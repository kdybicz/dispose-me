import * as fs from 'node:fs';
import { simpleParser } from 'mailparser';
import { Address, parse as parseEmailAddress } from 'address-rfc2822';

describe('Email Processor', () => {
  test('Parse simple email body', async () => {
    // given
    const email = await fs.readFileSync(`${__dirname}/data/simple.eml`).toString();

    // when
    const result = await simpleParser(email);
    // then
    expect(result?.from?.text).toEqual('"John Doe" <john.doe@example.com>');
  });

  test('Parse cc email', async () => {
    // given
    const email = await fs.readFileSync(`${__dirname}/data/cc.eml`).toString();

    // when
    const result = await simpleParser(email);
    // then
    expect(result?.from?.text).toEqual('"John Doe" <john.doe@example.com>');
  });

  test('Parse bcc email', async () => {
    // given
    const email = await fs.readFileSync(`${__dirname}/data/bcc.eml`).toString();

    // when
    const result = await simpleParser(email);
    // then
    expect(result?.from?.text).toEqual('"John Doe" <john.doe@example.com>');
  });

  test('Parse single email', () => {
    // given
    const emailString = 'John Doe <john.doe@test.com>';

    // when
    const result = parseEmailAddress(emailString);
    // then
    expect(result[0]).toBeInstanceOf(Address);
    expect((result[0] as Address).user()).toEqual('john.doe');
  });
});
