import { Address, parse as parseAddressObject } from 'address-rfc2822';
import { type AddressObject, type Attachment, simpleParser as parseEmail } from 'mailparser';

import log from './log';

export class EmailAddress {
  constructor(
    public address: string,
    public user: null | string,
    public host: null | string,
    public displayName: string,
  ) {}

  public format = (): string => {
    if (this.displayName) {
      return `${this.displayName} <${this.address}>`;
    }

    return this.address;
  };
}

export type AttachmentDetails = {
  filename?: string;
  size: number;
  contentType: string;
  content?: Buffer<ArrayBufferLike>;
};

export type ParsedEmail = {
  from: null | EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  body: string;
  received: Date;
  attachments: AttachmentDetails[];
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

  const mappedEmailAddresses = parsedAddresses.map<EmailAddress>(
    (address) => new EmailAddress(address.address, address.user(), address.host(), address.name()),
  );

  return mappedEmailAddresses;
};

const mapAttachments = (attachments: Attachment[]): AttachmentDetails[] => {
  return attachments
    .filter((attachment) => !attachment.related && attachment.contentDisposition === 'attachment')
    .map<AttachmentDetails>((attachment) => ({
      filename: attachment.filename,
      size: attachment.size,
      contentType: attachment.contentType,
      content: attachment.content,
    }));
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
      attachments: mapAttachments(email.attachments),
    };
  }
}
