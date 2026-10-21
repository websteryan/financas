export type Theme = "minimal" | "moderno";

export const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: "minimal", label: "Minimal", hint: "Preto e bordas finas, sóbrio" },
  { value: "moderno", label: "Moderno", hint: "Roxo profundo e movimento expressivo" },
];

const KEY = "lastro-tema";

/** Roda antes da pintura para não piscar o tema errado. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");document.documentElement.dataset.theme=t==="moderno"?"moderno":"minimal"}catch(e){}`;

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "moderno" ? "moderno" : "minimal";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", t === "moderno" ? "#07050c" : "#000000");
}
