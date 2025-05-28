import { Address, parse as parseAddressObject } from 'address-rfc2822';
import { type AddressObject, simpleParser as parseEmail } from 'mailparser';

import log from './log';

export type EmailAddress = {
  address: string;
  user: null | string;
  host: null | string;
  displayName: string;
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

const parseEmailAddresses = (
  addresses: undefined | AddressObject | AddressObject[],
): EmailAddress[] => {
  if (!addresses) {
    return [];
  }

  let parsedAddresses: Address[] = [];
  if (Array.isArray(addresses)) {
    parsedAddresses = addresses
      .flatMap((address) => parseAddressObject(address.text))
      .filter((item): item is Address => item instanceof Address);
  } else {
    parsedAddresses = parseAddressObject(addresses.text).filter(
      (item): item is Address => item instanceof Address,
    );
  }

  const mappedEmailAddresses = parsedAddresses.map<EmailAddress>((address) => ({
    address: address.address,
    user: address.user(),
    host: address.host(),
    displayName: address.name(),
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
