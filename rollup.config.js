import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  external: ['url-resolver-fs'],

  output: {
    file: pkg.main,
    format: 'cjs'
  },

  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ],

  input: pkg.module
};
