import { type Demo, el } from "./demo.js"
import { ticTacToeDemo } from "./games/ticTacToe.js"
import "./style.css"

const demos: Demo[] = [ticTacToeDemo]

const section = (demo: Demo): HTMLElement => {
  const playground = el("div", { class: "playground" })
  const node = el("section", { class: "card" }, [
    el("h2", {}, [demo.title, el("code", { class: "pkg" }, [demo.pkg])]),
    el("p", { class: "summary" }, [demo.summary]),
    playground,
    el("details", {}, [
      el("summary", {}, ["導入"]),
      el("pre", { class: "code" }, [`pnpm add ${demo.pkg}`]),
      el("pre", { class: "code" }, [demo.snippet]),
    ]),
  ])

  demo.mount(playground)

  return node
}

const app = document.querySelector("#app")

if (app === null) throw new Error("#app not found")

app.replaceChildren(
  el("header", {}, [
    el("h1", {}, ["gamod"]),
    el("p", {}, [
      "ゲームの局面を渡すと最善手を返すパッケージ群。評価関数ではなく厳密解 (勝敗 + 決着までの手数) を返す。",
    ]),
  ]),
  ...demos.map(section),
  el("footer", {}, [
    el("a", { href: "https://github.com/elzup/gamod" }, [
      "github.com/elzup/gamod",
    ]),
  ])
)
