/**
 * electron-builder JS config — allows overriding the sign function
 * to completely bypass code signing (no certificate needed).
 */

const path = require('path');

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.compty.ate-intelligence',
  productName: 'ATE Intelligence',
  copyright: 'Copyright © 2024 Compty',

  directories: {
    output: 'dist-electron',
    buildResources: 'electron/assets',
  },

  files: [
    'electron/**/*',
    'backend/dist/**/*',
    'backend/package.json',
    'backend/node_modules/**/*',
    'frontend/.next/**/*',
    'frontend/public/**/*',
    'frontend/package.json',
    'frontend/node_modules/**/*',
    '.env',
    '!**/.git/**',
    '!**/node_modules/**/*.md',
    '!**/node_modules/**/*.map',
    '!**/*.ts',
  ],

  extraResources: [
    {
      from: 'electron/assets/redis',
      to: 'redis',
      filter: ['*.exe', '*.conf'],
    },
  ],

  win: {
    target: [{ target: 'portable', arch: ['x64'] }],
    icon: 'electron/assets/icon.ico',
    // Disable code signing completely — no certificate required
    signAndEditExecutable: false,
    signExts: [],
  },
};
