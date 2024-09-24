process.env.LOG_LEVEL = 2;

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/*.test.ts',
  ],
  preset: 'ts-jest'
};
