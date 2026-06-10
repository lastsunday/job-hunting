const baseConfig = require('../../eslint.config.cjs');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  ...baseConfig,
  react.configs.flat.recommended,
  reactHooks.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
    settings: { react: { version: '19.0' } },
  },
];
