import * as fs from 'fs';

import { EmailParser } from '../../tools/EmailParser';

describe('EmailParser tests', () => {
  const parser = new EmailParser();

  test('Parse simple email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/simple.eml`).toString();

    // when:
    const result = await parser.parseEmail(data);
    // then:
    expect(result.body).toEqual('Hello world!');
    expect(result.received).toEqual(new Date('Sun, 8 Jan 2017 20:37:44 +0200'));
    expect(result.from).toEqual([{
      address: 'john.doe@disposeme.de',
      user: 'john.doe',
    }]);
    expect(result.to).toEqual([{
      address: 'jane.doe@disposeme.de',
      user: 'jane.doe',
    }]);
  });

  test('Parse complex email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/complex.eml`).toString();

    // when:
    const result = await parser.parseEmail(data);
    // then:
    expect(result.body).toMatch('<p><b>Hello</b> to myself <img src=');
    expect(result.received).toEqual(new Date('Thu, 13 Oct 2016 13:39:48 +0200'));
    expect(result.from).toEqual([
      {
        address: 'andris@kreata.ee',
        user: 'andris',
      },
    ]);
    expect(result.to).toEqual([
      {
        address: 'andris+123@kreata.ee',
        user: 'andris+123',
      },
      {
        address: 'andris.reinman@gmail.com',
        user: 'andris.reinman',
      },
    ]);
  });
});
