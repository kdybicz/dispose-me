import { parse as parseEmailAddress } from 'address-rfc2822';
import { simpleParser as parseEmail, AddressObject } from 'mailparser';

import log from '../tools/log';

export type EmailAddress = {
  address: string;
  user: string;
}

export type Email = {
  id?: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  body: string;
  received: Date;
}

type ParsedEmailAddress = {
  address: string;
  user: () => string;
}

const parseEmailAddresses = (addresses: undefined | AddressObject | AddressObject[]): ParsedEmailAddress[] => {
  if (!addresses) {
    return [];
  }

  let parsedAddresses;
  if (Array.isArray(addresses)) {
    parsedAddresses = addresses.map((address) => parseEmailAddress(address.text)).flat();
  } else {
    parsedAddresses = parseEmailAddress(addresses.text);
  }

  return parsedAddresses.filter((address: ParsedEmailAddress) => address.constructor.name === 'Address');
};

export class EmailParser {
  // eslint-disable-next-line class-methods-use-this
  async parseEmail(emailContent: string): Promise<Email> {
    log.debug('Parsing email content to get sender and recipient information');
    const email = await parseEmail(emailContent);

    log.debug('Parsing sender and recipient email addresses');
    const senderEmails = parseEmailAddresses(email?.from);
    const recipientEmails = parseEmailAddresses(email.to);
    const carbonCopyEmails = parseEmailAddresses(email.cc);
    const blindCarbonCopyEmails = parseEmailAddresses(email.bcc);

    return {
      from: senderEmails.map((item) => ({ address: item.address, user: item.user() })),
      to: recipientEmails.map((item) => ({ address: item.address, user: item.user() })),
      cc: carbonCopyEmails.map((item) => ({ address: item.address, user: item.user() })),
      bcc: blindCarbonCopyEmails.map((item) => ({ address: item.address, user: item.user() })),
      subject: email.subject ?? '',
      body: (email.html !== false ? email.html : email.text) ?? '',
      received: email.date ?? new Date(0),
    };
  }
}
