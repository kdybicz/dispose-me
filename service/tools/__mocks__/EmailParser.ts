export class EmailParser {

  static mockParseEmail = jest.fn();

  async parseEmail(...args) {
    return EmailParser.mockParseEmail(...args);
  }
}
