import { defineConfig } from "vitest/config"

/** テーブルの圧縮・近似の計測。数十秒かかり合否も無いので、通常の pnpm test には含めない */
export default defineConfig({
  test: {
    include: ["experiment/**/*.test.ts"],
    testTimeout: 600_000,
  },
})
