import cleanup from 'rollup-plugin-cleanup';
import executable from 'rollup-plugin-executable';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import pkg from './package.json';

export default {
  external: ['url-resolver-fs', 'url', 'ssh2-sftp-client'],

  output: {
    file: pkg.main,
    format: 'cjs',
    interop: false
  },

  plugins: [],

  input: pkg.module
};
