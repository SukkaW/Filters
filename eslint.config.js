'use strict';

module.exports = require('eslint-config-sukka').sukka({}, {
  rules: {
    'no-restricted-globals': ['error', 'console'],
    'no-console': 'off'
  }
});
