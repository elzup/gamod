import { resolve } from "node:path"
import { defineConfig } from "vite"

const packages = resolve(import.meta.dirname, "../../packages")

export default defineConfig({
  // GitHub Pages 等のサブパス配信を想定して相対パスで出力する
  base: "./",
  server: {
    // portless 等のプロキシが渡す PORT/HOST に従う (未設定なら vite の既定)
    // biome-ignore lint/complexity/useLiteralKeys: tsconfig の noPropertyAccessFromIndexSignature が index アクセスを要求する
    port: Number(process.env["PORT"]) || undefined,
    // biome-ignore lint/complexity/useLiteralKeys: 同上
    host: process.env["HOST"] || undefined,
  },
  resolve: {
    alias: {
      // ビルド成果物 (lib/) ではなく src を直接見る。demo を動かすのに pnpm build を挟ませないため
      "@gamod/tic-tac-toe": resolve(packages, "tic-tac-toe/src/index.ts"),
    },
  },
})
