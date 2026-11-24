// components/room/roomTheme.ts — классы лобби для трёх тем проекта (classic / aurora / maleficent).
export interface RoomTheme {
  page: string; card: string; title: string; accent: string; muted: string; input: string;
  btn: string; btnGhost: string; btnDanger: string; chipOn: string; chipOff: string; chipBlocked: string;
  mine: string; rowSystem: string; bubbleMe: string; bubbleOther: string;
}
export const ROOM_THEMES: Record<string, RoomTheme> = {
  classic: {
    page: "bg-slate-950 text-slate-100", card: "bg-slate-900/70 border border-slate-700/60 rounded-2xl",
    title: "text-white font-black tracking-tight", accent: "text-emerald-400", muted: "text-slate-400",
    input: "bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 outline-none rounded-xl px-4 py-3",
    btn: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed",
    btnGhost: "border border-slate-600 hover:border-emerald-500 text-slate-200 rounded-xl px-4 py-2 transition",
    btnDanger: "border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-1 text-xs transition",
    chipOn: "border-emerald-500 bg-emerald-500/15 text-emerald-300", chipOff: "border-slate-700 hover:border-slate-500 text-slate-200", chipBlocked: "border-slate-800 text-slate-600 cursor-not-allowed",
    mine: "ring-1 ring-emerald-500/60", rowSystem: "text-slate-500", bubbleMe: "bg-emerald-500/20 text-emerald-50", bubbleOther: "bg-slate-800 text-slate-100",
  },
  aurora: {
    page: "bg-gradient-to-br from-pink-50 via-violet-50 to-sky-50 text-slate-800", card: "bg-white/80 border border-pink-200 rounded-3xl shadow-sm",
    title: "text-violet-900 font-black tracking-tight", accent: "text-pink-600", muted: "text-slate-500",
    input: "bg-white border border-pink-200 text-slate-800 placeholder-slate-400 focus:border-pink-400 outline-none rounded-2xl px-4 py-3",
    btn: "bg-pink-500 hover:bg-pink-400 text-white font-black rounded-2xl px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed",
    btnGhost: "border border-pink-300 hover:border-pink-500 text-pink-700 rounded-2xl px-4 py-2 transition",
    btnDanger: "border border-red-300 text-red-500 hover:bg-red-50 rounded-lg px-3 py-1 text-xs transition",
    chipOn: "border-pink-400 bg-pink-100 text-pink-700", chipOff: "border-pink-100 hover:border-pink-300 text-slate-700", chipBlocked: "border-slate-100 text-slate-300 cursor-not-allowed",
    mine: "ring-1 ring-pink-400", rowSystem: "text-slate-400", bubbleMe: "bg-pink-100 text-pink-900", bubbleOther: "bg-violet-100 text-violet-900",
  },
  maleficent: {
    page: "bg-[#07030d] text-purple-100", card: "bg-purple-950/30 border border-purple-800/50 rounded-xl",
    title: "text-fuchsia-300 font-black tracking-tight font-mono", accent: "text-fuchsia-400", muted: "text-purple-300/60",
    input: "bg-black/40 border border-purple-800/60 text-purple-100 placeholder-purple-400/40 focus:border-fuchsia-500 outline-none rounded-lg px-4 py-3 font-mono",
    btn: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black rounded-lg px-5 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed",
    btnGhost: "border border-purple-700 hover:border-fuchsia-500 text-purple-200 rounded-lg px-4 py-2 transition",
    btnDanger: "border border-red-600/50 text-red-400 hover:bg-red-900/20 rounded-md px-3 py-1 text-xs transition",
    chipOn: "border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-200", chipOff: "border-purple-900 hover:border-purple-600 text-purple-200", chipBlocked: "border-purple-950 text-purple-900 cursor-not-allowed",
    mine: "ring-1 ring-fuchsia-500/60", rowSystem: "text-purple-400/50", bubbleMe: "bg-fuchsia-500/20 text-fuchsia-50", bubbleOther: "bg-purple-900/40 text-purple-100",
  },
};
export const getRoomTheme = (t: string): RoomTheme => ROOM_THEMES[t] ?? ROOM_THEMES.classic;
