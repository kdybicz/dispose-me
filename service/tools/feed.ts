import { Feed, type Item } from 'feed';
import type { EmailDetails } from '../api/InboxController';
import { AUTH_QUERY_KEY } from './const';

export const mapEmailDetailsToFeedItem = (
  email: EmailDetails,
  username: string,
  token: string,
): Item => ({
  id: email.id,
  title: email.subject,
  link: `https://${process.env.DOMAIN_NAME}/inbox/${username}/${email.id}?${AUTH_QUERY_KEY}=${token}`,
  content: email.body,
  author: email.from
    .map((email) => ({
      name: email.user,
      email: email.address,
    })),
  contributor: email.to
    .concat(email.cc)
    .concat(email.bcc)
    .map((email) => ({
      name: email.user,
      email: email.address,
    })),
  date: email.received,
});

export const mapEmailDetailsListToFeed = (
  emails: EmailDetails[],
  username: string,
  token: string,
): string => {
  let updated = new Date();
  if (emails) {
    updated = emails[0].received;
  }

  const feed = new Feed({
    id: `https://${process.env.DOMAIN_NAME}/`,
    title: 'Dispose Me',
    description: 'Dispose Me is a simple AWS-hosted disposable email service.',
    link: `https://${process.env.DOMAIN_NAME}/inbox/${username}?${AUTH_QUERY_KEY}=${token}`,
    copyright: 'Dispose Me',
    updated,
    generator: 'Dispose Me',
  });

  emails.forEach((email) => feed.addItem(mapEmailDetailsToFeedItem(email, username, token)));

  return feed.rss2();
};
