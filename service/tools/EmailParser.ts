import { parse as parseAddressObject } from 'address-rfc2822';
import { type AddressObject, simpleParser as parseEmail } from 'mailparser';

import log from './log';

export type EmailAddress = {
  address: string;
  user: string;
};

export type ParsedEmail = {
  from: null | EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  body: string;
  received: Date;
};

type ParsedRfc2822EmailAddress = {
  address: string;
  user: () => string;
};

const parseEmailAddresses = (
  addresses: undefined | AddressObject | AddressObject[],
): EmailAddress[] => {
  if (!addresses) {
    return [];
  }

  let parsedAddresses: ParsedRfc2822EmailAddress[] = [];
  if (Array.isArray(addresses)) {
    parsedAddresses = addresses.flatMap((address) => parseAddressObject(address.text));
  } else {
    parsedAddresses = parseAddressObject(addresses.text);
  }

  const mappedEmailAddresses = parsedAddresses
    .filter((address: ParsedRfc2822EmailAddress) => address.constructor.name === 'Address')
    .map<EmailAddress>((address) => ({
      address: address.address,
      user: address.user(),
    }));

  return mappedEmailAddresses;
};

export class EmailParser {
  async parseEmail(emailContent: string): Promise<ParsedEmail> {
    log.debug('Parsing email content to get sender and recipient information');
    const email = await parseEmail(emailContent);

    log.debug('Parsing sender and recipient email addresses');

    return {
      from: parseEmailAddresses(email?.from).pop() ?? null,
      to: parseEmailAddresses(email.to),
      cc: parseEmailAddresses(email.cc),
      bcc: parseEmailAddresses(email.bcc),
      subject: email.subject ?? '',
      body: (email.html !== false ? email.html : email.text) ?? '',
      received: email.date ?? new Date(0),
    };
  }
}
