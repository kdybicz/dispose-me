export class S3FileSystem {
  // Static properties to access the mocks from your tests
  static mockGetObject = jest.fn();
  static mockGetObjects = jest.fn();

  getObject(...args) {
    // Call the static mock so tests can control it
    return S3FileSystem.mockGetObject(...args);
  }

  getObjects(...args) {
    return S3FileSystem.mockGetObjects(...args);
  }
}
