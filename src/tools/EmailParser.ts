import { parse as parseEmailAddress } from 'address-rfc2822';
import { simpleParser as parseEmail } from 'mailparser';

import log from '../tools/log';

export type EmailAddress = {
  address: string;
  user: string;
}

export type Email = {
  id?: string;
  from: EmailAddress[];
  to: EmailAddress[];
  subject: string;
  body: string;
  received: Date;
}

export class EmailParser {
  // eslint-disable-next-line class-methods-use-this
  async parseEmail(emailContent: string): Promise<Email> {
    log.debug('Parsing email content to get sender and recipient information');
    const email = await parseEmail(emailContent);

    log.debug('Parsing sender and recipient email addresses');
    const senderEmails = parseEmailAddress(email.from.text);
    const recipientEmails = parseEmailAddress(email.to.text);

    return {
      from: senderEmails.map((item) => ({ address: item.address, user: item.user() })),
      to: recipientEmails.map((item) => ({ address: item.address, user: item.user() })),
      subject: email.subject,
      body: email.html !== false ? email.html : email.text,
      received: email.date,
    };
  }
}
