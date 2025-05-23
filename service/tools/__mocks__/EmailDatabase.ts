export class EmailDatabase {
  static mockStoreEmail = jest.fn();
  static mockListEmails = jest.fn();
  static mockEmailExist = jest.fn();
  static mockDeleteEmail = jest.fn();

  async store(...args) {
    return EmailDatabase.mockStoreEmail(...args);
  }

  async list(...args) {
    return EmailDatabase.mockListEmails(...args);
  }

  async exists(...args) {
    return EmailDatabase.mockEmailExist(...args);
  }

  async delete(...args) {
    return EmailDatabase.mockDeleteEmail(...args);
  }
}
