import type { EmailDetails } from '../../../service/api/InboxController';
import { mapEmailDetailsListToFeed, mapEmailDetailsToFeedItem } from '../../../service/tools/feed';

describe('feed tests', () => {
  describe('mapEmailDetailsToFeedItem', () => {
    test('map email details to feed item', () => {
      // given
      const date = new Date('Mon, 01 Jan 2024 01:01:01 GMT');
      const email: EmailDetails = {
        id: 'id',
        from: [{ address: 'john.doe@example.com', user: 'john.doe' }],
        to: [{ address: 'jane.doe@example.com', user: 'jane.doe' }],
        cc: [{ address: 'maria.doe@example.com', user: 'maria.doe' }],
        bcc: [{ address: 'hidden@example.com', user: 'hidden' }],
        subject: 'subject',
        body: 'body',
        received: date,
      };
      const username = 'username';
      const token = 'token';

      // when
      const result = mapEmailDetailsToFeedItem(email, username, token);
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
            name: 'hidden',
          },
        ],
        content: 'body',
        date: date,
        id: 'id',
        link: 'https://example.com/inbox/username/id?x-api-key=token',
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
      const username = 'username';
      const token = 'token';

      // when
      const result = mapEmailDetailsListToFeed(emails, username, token).rss2();
      // then
      expect(result).toEqual(
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          '        <link>https://example.com/inbox/username?x-api-key=token</link>\n' +
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
          from: [{ address: 'john.doe@example.com', user: 'john.doe' }],
          to: [{ address: 'jane.doe@example.com', user: 'jane.doe' }],
          cc: [{ address: 'maria.doe@example.com', user: 'maria.doe' }],
          bcc: [{ address: 'hidden@example.com', user: 'hidden' }],
          subject: 'subject',
          body: 'body',
          received: new Date('Mon, 01 Jan 2024 00:01:01 GMT'),
        },
      ];
      const username = 'username';
      const token = 'token';

      // when
      const result = mapEmailDetailsListToFeed(emails, username, token).rss2();
      // then
      expect(result).toEqual(
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          '        <link>https://example.com/inbox/username?x-api-key=token</link>\n' +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Mon, 01 Jan 2024 00:01:01 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '        <item>\n' +
          '            <title><![CDATA[subject]]></title>\n' +
          '            <link>https://example.com/inbox/username/id?x-api-key=token</link>\n' +
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
