import es from "./es.json";
import en from "./en.json";

export const dictionaries = { es, en } as const;

export type Lang = keyof typeof dictionaries;
export type TKey = keyof (typeof dictionaries)["es"];

export const defaultLang: Lang = "es";
export const supportedLangs: readonly Lang[] = ["es", "en"] as const;

export function useTranslations(lang: Lang) {
  const dict = dictionaries[lang] ?? dictionaries[defaultLang];
  return function t(key: TKey): string {
    return dict[key] ?? dictionaries[defaultLang][key] ?? String(key);
  };
}
