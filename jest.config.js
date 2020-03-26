module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  roots: [
    "<rootDir>/test",
    // "<rootDir>/types"
  ],
  setupFiles: [
    '<rootDir>config.ts'
  ],
  transform: {
    '.(ts|tsx)': 'ts-jest'
  },
  globals: {
    'ts-jest': {
      'compiler': 'ttypescript'
    }
  }
};