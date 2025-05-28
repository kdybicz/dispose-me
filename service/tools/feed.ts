import { type Author, Feed, type Item } from 'feed';

import type { EmailDetails } from '../api/InboxController';
import type { EmailAddress } from './EmailParser';
import { AUTH_QUERY_KEY } from './const';

const mapEmailAddressToAuthor = (address: null | EmailAddress): Author => ({
  name: address?.displayName ?? '',
  email: address?.address ?? '',
});

export const mapEmailDetailsToFeedItem = (
  email: EmailDetails,
  username: string,
  token: string,
): Item => ({
  id: email.id,
  title: email.subject,
  link: `https://${process.env.DOMAIN_NAME}/inbox/${username}/${email.id}?${AUTH_QUERY_KEY}=${token}`,
  content: email.body,
  author: [mapEmailAddressToAuthor(email.from)],
  contributor: email.to.concat(email.cc).concat(email.bcc).map(mapEmailAddressToAuthor),
  date: email.received,
});

export const mapEmailDetailsListToFeed = (
  emails: EmailDetails[],
  username: string,
  token: string,
): Feed => {
  let updated = new Date();
  if (emails.length > 0) {
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

  return feed;
};
