/** ゲームを 1 つ足すたびにこの形の Demo を 1 ファイル作り、registry に並べるだけにする */
export type Demo = {
  /** npm パッケージ名。install コマンドはここから作る */
  pkg: string
  title: string
  /** 何を計算するパッケージなのかの 1 行説明 */
  summary: string
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
