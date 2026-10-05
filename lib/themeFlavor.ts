// lib/themeFlavor.ts — иконки и украшения под каждую тему.
// classic: цветные эмодзи; aurora: мягкие/сказочные эмодзи и ✦;
// maleficent: монохромные символы (эмодзи на тёмном «терминале» выбиваются).
// VS15 (\uFE0E) принуждает символ рисоваться текстом, а не цветным эмодзи.
export type IconKey =
  | "board" | "news" | "awards" | "boot" | "assist" | "glove" | "young" | "team" | "rating" | "search" | "trophy" | "champion"
  | "scorer" | "match" | "rumor" | "history" | "league" | "cup" | "super" | "continental" | "all"
  | "contrib" | "cards" | "played" | "titles" | "best" | "bigwin" | "loss" | "thriller" | "apps"
  | "ok" | "track" | "risk" | "fail" | "pending" | "save" | "export" | "import" | "trash" | "draw" | "bye" | "tournament";

const V = "\uFE0E";
const CLASSIC: Record<IconKey, string> = {
  board: "🎯", news: "📰", awards: "🏆", boot: "👟", assist: "🎯", glove: "🧤", young: "🌱", team: "⭐", rating: "★", search: "🔎", trophy: "🏆", champion: "🏟️",
  scorer: "⚽", match: "🔥", rumor: "🔥", history: "📜", league: "🏟️", cup: "🏆", super: "⚡", continental: "🌍", all: "📊",
  contrib: "🔥", cards: "🟨", played: "🏃", titles: "🏆", best: "🥇", bigwin: "💥", loss: "😖", thriller: "🎢", apps: "🏃",
  ok: "✅", track: "🟢", risk: "🟠", fail: "❌", pending: "⏳", save: "💾", export: "⬇", import: "⬆", trash: "🗑", draw: "🎲", bye: "➡️", tournament: "🏆",
};
const AURORA: Record<IconKey, string> = {
  ...CLASSIC,
  board: "💌", news: "🕊️", awards: "👑", boot: "👟", assist: "🪄", glove: "🧤", young: "🌸", team: "💫", search: "🔮", trophy: "👑", champion: "👑",
  scorer: "⚽", match: "💖", rumor: "✨", history: "📖", league: "🌷", cup: "👑", super: "💫", continental: "🌍", all: "✨",
  contrib: "💖", cards: "🌼", played: "🦋", titles: "👑", best: "🌟", bigwin: "🎀", loss: "🌧️", thriller: "🎠", apps: "🦋",
  ok: "🌟", track: "🌿", risk: "🌧️", fail: "🥀", pending: "🕰️", save: "📚", draw: "🎀", bye: "✨", tournament: "👑",
};
const MALEFICENT: Record<IconKey, string> = {
  board: "◈", news: "▤", awards: "♛", boot: `⚔${V}`, assist: "✧", glove: "⛨", young: "▲", team: "✦", rating: "★", search: "⌕", trophy: "♛", champion: "♛",
  scorer: "◉", match: "✹", rumor: "≋", history: "▤", league: "▣", cup: "♛", super: "ϟ", continental: "⌖", all: "▦",
  contrib: "✹", cards: "▮", played: "▶", titles: "♛", best: "◆", bigwin: "✹", loss: `☠${V}`, thriller: "≋", apps: "▶",
  ok: "[✓]", track: "[►]", risk: "[!]", fail: "[✕]", pending: "[…]", save: "▣", export: "↓", import: "↑", trash: "✕", draw: "⌖", bye: "»", tournament: "♛",
};

export function icons(theme: string | null | undefined): Record<IconKey, string> {
  return theme === "aurora" ? AURORA : theme === "maleficent" ? MALEFICENT : CLASSIC;
}
export const icon = (theme: string | null | undefined, k: IconKey) => icons(theme)[k];

/** Медали пьедестала по темам */
export function medals(theme: string | null | undefined): [string, string, string] {
  if (theme === "aurora") return ["👑", "🌸", "🎀"];
  if (theme === "maleficent") return ["I", "II", "III"];
  return ["🥇", "🥈", "🥉"];
}
