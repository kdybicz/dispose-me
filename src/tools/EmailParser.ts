/* eslint-disable no-console */

import { parse as parseEmailAddress } from 'address-rfc2822';
import { simpleParser as parseEmail } from 'mailparser';

export type EmailAddress = {
  address: string;
  user: string;
}

export type Email = {
  body: string;
  date: Date;
  from: EmailAddress[];
  to: EmailAddress[];
}

export class EmailParser {
  // eslint-disable-next-line class-methods-use-this
  async parseEmail(emailContent: string): Promise<Email> {
    console.debug('Parsing original email to get recipient information');
    const email = await parseEmail(emailContent);

    console.debug('Parsing sender and recipient email addresses');
    const senderEmails = parseEmailAddress(email.from.text);
    const recipientEmails = parseEmailAddress(email.to.text);

    return {
      body: email.html !== false ? email.html : email.text,
      date: email.date,
      from: senderEmails.map((item) => ({ address: item.address, user: item.user() })),
      to: recipientEmails.map((item) => ({ address: item.address, user: item.user() })),
    };
  }
}
