import { defaultLang, supportedLangs, type Lang } from "./ui";

export function getLangFromUrl(url: URL): Lang {
  const seg = url.pathname.split("/")[1];
  if (supportedLangs.includes(seg as Lang)) return seg as Lang;
  return defaultLang;
}

export function localizedPath(lang: Lang, path = ""): string {
  const clean = path.replace(/^\//, "");
  if (lang === defaultLang) return "/" + clean;
  return `/${lang}/${clean}`;
}

export function alternateLang(lang: Lang): Lang {
  return lang === "es" ? "en" : "es";
}
