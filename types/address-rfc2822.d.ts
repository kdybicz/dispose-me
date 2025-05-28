declare module 'address-rfc2822' {
  class Address {
    constructor(phrase: string, address: string, comment: string);
    phrase: string;
    address: string;
    comment: string;
    host(): string | null;
    user(): string | null;
    format(): string;
    name(): string;
  }

  class Group {
    constructor(display_name: string, addresses: (Address | Group)[]);
    phrase: string;
    addresses: (Address | Group)[];
    format(): string;
    name(): string;
  }

  export interface ParseOptions {
    startAt?: 'address' | 'address-list' | 'angle-addr' | 'from' | 'group' | 'mailbox' | 'mailbox-list' | 'reply-to' | 'sender';
    atInDisplayName?: boolean;
    allowCommaInDisplayName?: boolean;
  }

  /**
   * Parses a line containing email addresses.
   * @throws Error if the input is empty or no addresses are found.
   */
  export function parse(line: string, opts?: ParseOptions | string | null): (Address | Group)[];
  export function parseFrom(line: string): (Address | Group)[];
  export function parseSender(line: string): (Address | Group)[];
  export function parseReplyTo(line: string): (Address | Group)[];

  export function isAllLower(str: string): boolean;
  export function isAllUpper(str: string): boolean;
  export function nameCase(str: string): string;
}
