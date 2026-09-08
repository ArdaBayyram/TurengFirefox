// Keeps dev/build noise out of the packaged add-on.
export default {
  ignoreFiles: [
    'package.json',
    'package-lock.json',
    'node_modules',
    'web-ext-artifacts',
    '.web-ext-config.mjs',
    '.gitignore',
    'README.md',
    'docs',
    '*.xpi',
    '.env'
  ]
};
