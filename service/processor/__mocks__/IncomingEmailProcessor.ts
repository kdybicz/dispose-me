export class IncomingEmailProcessor {

  static mockProcessEmail = jest.fn();

  async processEmail(...args) {
    return IncomingEmailProcessor.mockProcessEmail(...args);
  }
}
