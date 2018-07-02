import multiEntry from 'rollup-plugin-multi-entry';

export default {
  input: 'tests/**/*-test.js',
  external: ['ava', 'url-resolver-fs', 'ssh2-sftp-client', 'fs', 'url', 'path'],

  plugins: [multiEntry()],

  output: {
    file: 'build/bundle-test.js',
    format: 'cjs',
    sourcemap: true,
    interop: false
  }
};
