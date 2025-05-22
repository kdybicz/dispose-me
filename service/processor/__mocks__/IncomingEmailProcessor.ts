export class IncomingEmailProcessor {
  // Static properties to access the mocks from your tests
  static mockProcessEmail = jest.fn();

  async processEmail(...args) {
    return IncomingEmailProcessor.mockProcessEmail(...args);
  }
}
