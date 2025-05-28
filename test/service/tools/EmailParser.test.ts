import * as fs from 'node:fs';

import { EmailParser } from '../../../service/tools/EmailParser';

describe('EmailParser tests', () => {
  const parser = new EmailParser();

  test('Parse simple email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/simple.eml`).toString();

    // when
    const result = await parser.parseEmail(data);
    // then
    expect(result.body).toEqual('Hello world!');
    expect(result.received).toEqual(new Date('Sun, 8 Jan 2017 20:37:44 +0200'));
    expect(result.from).toEqual(
      expect.objectContaining({
        address: 'john.doe@example.com',
        displayName: 'John Doe',
        host: 'example.com',
        user: 'john.doe',
      }),
    );
    expect(result.to).toEqual([
      expect.objectContaining({
        address: 'jane.doe@example.com',
        displayName: 'Jane Doe',
        host: 'example.com',
        user: 'jane.doe',
      }),
    ]);
    expect(result.cc).toEqual([]);
    expect(result.bcc).toEqual([]);
  });

  test('Parse complex email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/complex.eml`).toString();

    // when
    const result = await parser.parseEmail(data);
    // then
    expect(result.body).toMatch('<p><b>Hello</b> to myself <img src=');
    expect(result.received).toEqual(new Date('Thu, 13 Oct 2016 13:39:48 +0200'));
    expect(result.from).toEqual(
      expect.objectContaining({
        address: 'john.doe@example.com',
        displayName: 'John Doe',
        host: 'example.com',
        user: 'john.doe',
      }),
    );
    expect(result.to).toEqual([
      expect.objectContaining({
        address: 'john.doe+123@example.com',
        displayName: 'John Doe+123',
        host: 'example.com',
        user: 'john.doe+123',
      }),
      expect.objectContaining({
        address: 'jane.doe@example.com',
        displayName: 'Jane Doe',
        host: 'example.com',
        user: 'jane.doe',
      }),
    ]);
    expect(result.cc).toEqual([]);
    expect(result.bcc).toEqual([]);
    expect(result.attachments).toEqual([
      {
        filename: 'notes.txt',
        size: 28,
      },
    ]);
  });

  test('Parse blind carbon copy email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/bcc.eml`).toString();

    // when
    const result = await parser.parseEmail(data);
    // then
    expect(result.body).toEqual('Hello world!\n');
    expect(result.received).toEqual(new Date('Wed, 9 Feb 2022 17:55:11 +0100'));
    expect(result.from).toEqual(
      expect.objectContaining({
        address: 'john.doe@example.com',
        displayName: 'John Doe',
        host: 'example.com',
        user: 'john.doe',
      }),
    );
    expect(result.to).toEqual([]);
    expect(result.cc).toEqual([]);
    expect(result.bcc).toEqual([
      expect.objectContaining({
        address: 'hidden@example.com',
        displayName: '',
        host: 'example.com',
        user: 'hidden',
      }),
    ]);
    expect(result.attachments).toEqual([]);
  });

  test('Parse carbon copy email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/cc.eml`).toString();

    // when
    const result = await parser.parseEmail(data);
    // then
    expect(result.body).toEqual('Hello world!\n');
    expect(result.received).toEqual(new Date('Wed, 9 Feb 2022 17:55:11 +0100'));
    expect(result.from).toEqual(
      expect.objectContaining({
        address: 'john.doe@example.com',
        displayName: 'John Doe',
        host: 'example.com',
        user: 'john.doe',
      }),
    );
    expect(result.to).toEqual([]);
    expect(result.cc).toEqual([
      expect.objectContaining({
        address: 'jane.doe@example.com',
        displayName: 'Jane Doe',
        host: 'example.com',
        user: 'jane.doe',
      }),
      expect.objectContaining({
        address: 'maria.doe@example.com',
        displayName: 'Maria Doe',
        host: 'example.com',
        user: 'maria.doe',
      }),
    ]);
    expect(result.bcc).toEqual([]);
    expect(result.attachments).toEqual([]);
  });
});
