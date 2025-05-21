process.env.DOMAIN_NAME = 'example.com';
process.env.LOG_LEVEL = 2;

module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'service/**/*.ts',
  ],
  testMatch: [
    '**/*.test.ts',
  ],
  preset: 'ts-jest'
};
