import type { EmailDetails } from '../../../service/api/InboxController';
import { AUTH_QUERY_KEY } from '../../../service/tools/const';
import { EmailAddress } from '../../../service/tools/EmailParser';
import {
  mapEmailAddressToAuthor,
  mapEmailDetailsListToFeed,
  mapEmailDetailsToFeedItem,
} from '../../../service/tools/feed';
import { QUERY_TOKEN, USERNAME } from '../../utils';

describe('feed tests', () => {
  describe('mapEmailAddressToAuthor()', () => {
    test('return Author with blank name and email if address not provided', () => {
      // when
      const result = mapEmailAddressToAuthor(null);
      // then
      expect(result).toEqual({
        name: '',
        email: '',
      });
    });

    test('return Author with mapped name and email fields', () => {
      // when
      const result = mapEmailAddressToAuthor(
        new EmailAddress('john.doe@example.com', null, null, 'John Doe'),
      );
      // then
      expect(result).toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    });
  });

  describe('mapEmailDetailsToFeedItem', () => {
    test('map email details to feed item', () => {
      // given
      const date = new Date('Mon, 01 Jan 2024 01:01:01 GMT');
      const email: EmailDetails = {
        id: 'id',
        from: new EmailAddress('john.doe@example.com', 'john.doe', 'example.com', 'john.doe'),
        to: [new EmailAddress('jane.doe@example.com', 'jane.doe', 'example.com', 'jane.doe')],
        cc: [new EmailAddress('maria.doe@example.com', 'maria.doe', 'example.com', 'maria.doe')],
        bcc: [new EmailAddress('hidden@example.com', 'hidden', 'example.com', '')],
        subject: 'subject',
        body: 'body',
        received: date,
        attachments: [],
      };

      // when
      const result = mapEmailDetailsToFeedItem(email, USERNAME, QUERY_TOKEN);
      // then
      expect(result).toEqual({
        author: [
          {
            email: 'john.doe@example.com',
            name: 'john.doe',
          },
        ],
        contributor: [
          {
            email: 'jane.doe@example.com',
            name: 'jane.doe',
          },
          {
            email: 'maria.doe@example.com',
            name: 'maria.doe',
          },
          {
            email: 'hidden@example.com',
            name: '',
          },
        ],
        content: 'body',
        date: date,
        id: 'id',
        link: `https://example.com/inbox/username/id?${AUTH_QUERY_KEY}=${QUERY_TOKEN}`,
        title: 'subject',
      });
    });
  });

  describe('mapEmailDetailsListToFeed', () => {
    test('map feed with no items', () => {
      // given
      jest.useFakeTimers().setSystemTime(new Date('Sun, 01 Jan 2023 01:01:01 GMT'));
      // and
      const emails: EmailDetails[] = [];

      // when
      const result = mapEmailDetailsListToFeed(emails, USERNAME, QUERY_TOKEN).rss2();
      // then
      expect(result).toEqual(
        // biome-ignore lint/style/useTemplate: <explanation>
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          `        <link>https://example.com/inbox/username?${AUTH_QUERY_KEY}=${QUERY_TOKEN}</link>\n` +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Sun, 01 Jan 2023 01:01:01 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '    </channel>\n' +
          '</rss>',
      );
    });

    test('map feed with a item', () => {
      // given
      jest.useFakeTimers().setSystemTime(new Date('Mon, 01 Jan 2023 00:01:01 GMT'));
      // and
      const emails: EmailDetails[] = [
        {
          id: 'id',
          from: new EmailAddress('john.doe@example.com', 'john.doe', 'example.com', 'john.doe'),
          to: [new EmailAddress('jane.doe@example.com', 'jane.doe', 'example.com', 'jane.doe')],
          cc: [new EmailAddress('maria.doe@example.com', 'maria.doe', 'example.com', 'maria.doe')],
          bcc: [new EmailAddress('hidden@example.com', 'hidden', 'example.com', '')],
          subject: 'subject',
          body: 'body',
          received: new Date('Mon, 01 Jan 2024 00:01:01 GMT'),
          attachments: [],
        },
      ];

      // when
      const result = mapEmailDetailsListToFeed(emails, USERNAME, QUERY_TOKEN).rss2();
      // then
      expect(result).toEqual(
        // biome-ignore lint/style/useTemplate: <explanation>
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          `        <link>https://example.com/inbox/username?${AUTH_QUERY_KEY}=${QUERY_TOKEN}</link>\n` +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Mon, 01 Jan 2024 00:01:01 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '        <item>\n' +
          '            <title><![CDATA[subject]]></title>\n' +
          `            <link>https://example.com/inbox/username/id?${AUTH_QUERY_KEY}=${QUERY_TOKEN}</link>\n` +
          '            <guid>id</guid>\n' +
          '            <pubDate>Mon, 01 Jan 2024 00:01:01 GMT</pubDate>\n' +
          '            <content:encoded><![CDATA[body]]></content:encoded>\n' +
          '            <author>john.doe@example.com (john.doe)</author>\n' +
          '        </item>\n' +
          '    </channel>\n' +
          '</rss>',
      );
    });
  });
});
