/* eslint-disable no-console */

import { parse as parseEmailAddress } from 'address-rfc2822';
import { simpleParser as parseEmail } from 'mailparser';

export type EmailAddress = {
  address: string;
  user: string;
}

export type Email = {
  from: EmailAddress[];
  to: EmailAddress[];
  subject: string;
  body: string;
  date: Date;
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
      from: senderEmails.map((item) => ({ address: item.address, user: item.user() })),
      to: recipientEmails.map((item) => ({ address: item.address, user: item.user() })),
      subject: email.subject,
      body: email.html !== false ? email.html : email.text,
      date: email.date,
    };
  }
}
