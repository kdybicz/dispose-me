process.env.DOMAIN_NAME = 'example.com';
process.env.INBOX_BLACKLIST = 'hostmaster,postmaster,webmaster,admin,administrator,abuse,root,ssl-admin,majordomo';
process.env.LOG_LEVEL = 2;

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/*.test.ts',
  ],
  collectCoverageFrom: [
    'service/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
