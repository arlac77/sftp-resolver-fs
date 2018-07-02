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
