import pkg from './package.json';

export default {
  external: ['url-resolver-fs'],

  output: {
    file: pkg.main,
    format: 'cjs'
  },

  plugins: [],

  input: pkg.module
};
