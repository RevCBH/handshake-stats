module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
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