export const LOCALES = ["ja", "en"] as const
export type Locale = (typeof LOCALES)[number]
export type LocalizedText = Record<Locale, string>

const STORAGE_KEY = "gamod-locale"
const DEFAULT_LOCALE: Locale = "ja"

const readSaved = (): Locale => {
  const saved = localStorage.getItem(STORAGE_KEY)

  return saved === "en" || saved === "ja" ? saved : DEFAULT_LOCALE
}

let current: Locale = readSaved()

export const getLocale = (): Locale => current

export const setLocale = (locale: Locale): void => {
  current = locale
  localStorage.setItem(STORAGE_KEY, locale)
}
