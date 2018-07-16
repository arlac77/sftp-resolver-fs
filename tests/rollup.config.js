import istanbul from 'rollup-plugin-istanbul';

import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
  input: 'tests/**/*-test.js',
  external: [
    'ava',
    'stream-equal',
    'url-resolver-fs',
    'ssh2-sftp-client',
    'ssh2',
    'fs',
    'url',
    'path'
  ],

  plugins: [multiEntry(), istanbul({
    exclude: ['tests/**/*-test.js']
  }), resolve(), commonjs()],

  output: {
    file: 'build/bundle-test.js',
    format: 'cjs',
    sourcemap: true,
    interop: false
  }
};
