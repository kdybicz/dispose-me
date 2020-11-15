process.env.LOG_LEVEL = 2;

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/?(*.)+(spec|test).[tj]s?(x)',
  ],
  preset: 'ts-jest',
};
