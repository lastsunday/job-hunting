const baseConfig = require('../../eslint.config.cjs');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {},
    languageOptions: {
      parser: require('jsonc-eslint-parser'),
    },
  },
];
