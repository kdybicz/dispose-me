export class EmailParser {
  // Static properties to access the mocks from your tests
  static mockParseEmail = jest.fn();

  async parseEmail(...args) {
    return EmailParser.mockParseEmail(...args);
  }
}
