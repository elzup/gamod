import { type Demo, el, REPO_URL, readmeUrl } from "./demo.js"
import { ticTacToeDemo } from "./games/ticTacToe.js"
import {
  getLocale,
  LOCALES,
  type Locale,
  type LocalizedText,
  setLocale,
} from "./i18n.js"
import "./style.css"

const demos: Demo[] = [ticTacToeDemo]

const UI = {
  tagline: {
    ja: "ゲームの局面を渡すと最善手を返すパッケージ群。評価関数による近似ではなく、完全読みと同じ結果になる手を返す。",
    en: "Packages that return the best move for a given game state — a move with the same result as exhaustive search, not an approximation.",
  },
  usage: { ja: "導入", en: "Usage" },
  title: { ja: "gamod — ゲームの最善手", en: "gamod — best moves for games" },
} satisfies Record<string, LocalizedText>

const LOCALE_LABEL: Record<Locale, string> = { ja: "日本語", en: "English" }

let activeDemo = 0

const section = (demo: Demo): HTMLElement => {
  const locale = getLocale()
  const playground = el("div", { class: "playground" })
  const node = el("section", { class: "card" }, [
    el("h2", {}, [
      demo.title[locale],
      el("a", { class: "pkg", href: readmeUrl(demo.pkg) }, [demo.pkg]),
    ]),
    el("p", { class: "summary" }, [demo.summary[locale]]),
    playground,
    el("details", { open: "" }, [
      el("summary", {}, [UI.usage[locale]]),
      el("pre", { class: "code" }, [`pnpm add ${demo.pkg}`]),
      el("pre", { class: "code" }, [demo.snippet]),
    ]),
  ])

  demo.mount(playground)

  return node
}

const demoTabs = (): HTMLElement => {
  const locale = getLocale()
  const tabs = demos.map((demo, index) => {
    const active = index === activeDemo
    const tab = el(
      "button",
      {
        type: "button",
        role: "tab",
        class: `tab${active ? " active" : ""}`,
        "aria-selected": String(active),
      },
      [demo.title[locale]]
    )

    tab.addEventListener("click", () => {
      if (index === activeDemo) return
      activeDemo = index
      renderApp()
    })

    return tab
  })

  return el("div", { class: "tabs", role: "tablist" }, tabs)
}

const langSwitch = (): HTMLElement => {
  const current = getLocale()
  const buttons = LOCALES.map((locale) => {
    const active = locale === current
    const button = el(
      "button",
      {
        type: "button",
        class: `lang-button${active ? " active" : ""}`,
        "aria-pressed": String(active),
      },
      [LOCALE_LABEL[locale]]
    )

    button.addEventListener("click", () => {
      if (locale === getLocale()) return
      setLocale(locale)
      renderApp()
    })

    return button
  })

  return el("div", { class: "lang" }, buttons)
}

const app = document.querySelector("#app")

if (app === null) throw new Error("#app not found")

const renderApp = () => {
  const locale = getLocale()
  const demo = demos[activeDemo]

  if (demo === undefined) throw new Error(`no demo at index ${activeDemo}`)

  document.documentElement.lang = locale
  document.title = UI.title[locale]

  app.replaceChildren(
    el("header", {}, [
      el("div", { class: "header-row" }, [
        el("h1", {}, ["gamod"]),
        langSwitch(),
      ]),
      el("p", {}, [UI.tagline[locale]]),
    ]),
    demoTabs(),
    section(demo),
    el("footer", {}, [el("a", { href: REPO_URL }, ["github.com/elzup/gamod"])])
  )
}

renderApp()
