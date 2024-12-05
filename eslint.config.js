'use strict';

module.exports = require('eslint-config-sukka').sukka({}, {
  files: ['./src/scriptlets/sukka-defuse-devtools-detector/*'],
  rules: {
    'no-restricted-globals': ['error', 'console'],
    'no-console': 'off'
  }
});
