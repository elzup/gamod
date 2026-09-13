/** ゲームを 1 つ足すたびにこの形の Demo を 1 ファイル作り、registry に並べるだけにする */
import type { LocalizedText } from "./i18n.js"

export const REPO_URL = "https://github.com/elzup/gamod"

/** パッケージ名 (@gamod/<game>) から GitHub 上の readme を指す URL を作る */
export const readmeUrl = (pkg: string): string =>
  `${REPO_URL}/tree/main/packages/${pkg.replace(/^@gamod\//, "")}#readme`

export type Demo = {
  /** npm パッケージ名。install コマンドはここから作る */
  pkg: string
  title: LocalizedText
  /** 何を計算するパッケージなのかの 1 行説明 */
  summary: LocalizedText
  /** 最小の使い方 */
  snippet: string
  mount: (root: HTMLElement) => void
}

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)

  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, value)
  node.append(...children)

  return node
}
