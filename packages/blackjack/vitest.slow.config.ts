import { defineConfig } from "vitest/config"

/** 数秒〜十数秒かかり、ルールを変えない限り結果も変わらない検証。通常の pnpm test には含めない */
export default defineConfig({
  test: {
    include: ["slow/**/*.test.ts"],
    // 単独で各約 2 秒。他の重い処理と並ぶと 5 秒の既定を超えた実績があるので余裕を取る
    testTimeout: 60_000,
  },
})
