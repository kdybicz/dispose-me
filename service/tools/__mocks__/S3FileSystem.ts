export class S3FileSystem {
  // Static properties to access the mocks from your tests
  static getObject = jest.fn();
  static getObjects = jest.fn();

  getObject(...args) {
    // Call the static mock so tests can control it
    return S3FileSystem.getObject(...args);
  }

  getObjects(...args) {
    return S3FileSystem.getObjects(...args);
  }
}
