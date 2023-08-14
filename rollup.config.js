import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/bundle.js",
      format: "umd",
      name: "Scroll",
    },
    {
      file: "dist/bundle.min.js",
      format: "umd",
      name: "Scroll",
      plugins: [terser()],
    },
  ],
  plugins: [typescript(), resolve(), peerDepsExternal()],
};
