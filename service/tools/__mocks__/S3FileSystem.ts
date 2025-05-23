export class S3FileSystem {

  static mockGetObject = jest.fn();
  static mockGetObjects = jest.fn();

  getObject(...args) {
    return S3FileSystem.mockGetObject(...args);
  }

  getObjects(...args) {
    return S3FileSystem.mockGetObjects(...args);
  }
}
