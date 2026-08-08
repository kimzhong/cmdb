/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/test/__tests__/**/*.spec.ts',
    '<rootDir>/src/**/__tests__/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@cmdb/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@cmdb/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: { lines: 60, functions: 60, statements: 60, branches: 50 },
  },
};
