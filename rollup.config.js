import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";
import json from "rollup-plugin-json";
import cleanup from "rollup-plugin-cleanup";
import pkg from "./package.json";

export default {
  input: pkg.module,
  output: {
    file: pkg.main,
    format: "cjs",
    interop: false
  },
  external: ["url-resolver-fs", "url", "ssh2-sftp-client"],
  plugins: [resolve(), commonjs(), cleanup()]
};
