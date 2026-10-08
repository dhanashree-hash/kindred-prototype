module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-console': 'off',
  },
  overrides: [
    {
      // Jest test files — add Jest globals so ESLint knows describe/test/expect
      files: ['**/__tests__/**/*.js'],
      env: {
        jest: true,
      },
    },
  ],
};
