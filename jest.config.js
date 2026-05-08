module.exports = {
  // Minimal config for utility tests — no jest-expo preset so we avoid
  // react-native/jest/setup.js which uses Flow syntax incompatible with
  // this project's babel-preset-expo (metro-react-native-babel-preset 0.76).
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  // Don't transform any node_modules — Node.js handles ethers CJS natively (private class methods etc.)
  transformIgnorePatterns: ['node_modules'],
  moduleNameMapper: {
    // Provide a lean Platform mock — all we need from react-native in utils
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
    // Path alias from tsconfig
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFiles: [
    '<rootDir>/jest.setup.js',
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: [
    'utils/**/*.{ts,tsx}',
    '!utils/**/*.d.ts',
  ],
};
