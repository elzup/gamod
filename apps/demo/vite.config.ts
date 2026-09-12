import { resolve } from "node:path"
import { defineConfig } from "vite"

const packages = resolve(import.meta.dirname, "../../packages")

export default defineConfig({
  // GitHub Pages 等のサブパス配信を想定して相対パスで出力する
  base: "./",
  resolve: {
    alias: {
      // ビルド成果物 (lib/) ではなく src を直接見る。demo を動かすのに pnpm build を挟ませないため
      "@gamod/tic-tac-toe": resolve(packages, "tic-tac-toe/src/index.ts"),
    },
  },
})
