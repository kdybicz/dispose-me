const realModule = jest.requireActual('../EmailParser');

export const EmailAddress = realModule.EmailAddress;

export class EmailParser {
  static mockParseEmail = jest.fn();

  async parseEmail(...args) {
    return EmailParser.mockParseEmail(...args);
  }
}
