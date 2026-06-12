export const LEAGUE_THEMES: Record<
  string,
  {
    classic: { gradient: string; accent: string; badge: string; rawColor: string };
    aurora: { gradient: string; accent: string; badge: string; rawColor: string };
    maleficent: { gradient: string; accent: string; badge: string; rawColor: string };
  }
> = {
  "Premier League": {
    classic: { gradient: "from-[#2a1148] via-[#3a1763] to-[#0f172a]", accent: "text-fuchsia-300", badge: "bg-fuchsia-500/15 text-fuchsia-100", rawColor: "#3d195b" },
    aurora: { gradient: "from-fuchsia-100 via-purple-100 to-pink-100", accent: "text-fuchsia-700 font-serif italic", badge: "bg-fuchsia-200 text-fuchsia-800", rawColor: "#be185d" },
    maleficent: { gradient: "from-black via-[#1a0022] to-[#05000a]", accent: "text-fuchsia-400 drop-shadow-[0_0_8px_#3d195b]", badge: "border border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-950/20", rawColor: "#d946ef" }
  },

  "LALIGA EA SPORTS": {
    classic: { gradient: "from-zinc-900 via-slate-800 to-black", accent: "text-red-300", badge: "bg-red-500/20 text-red-100", rawColor: "#ee2e24" },
    aurora: { gradient: "from-red-50 via-slate-100 to-zinc-100", accent: "text-red-600 font-serif italic", badge: "bg-red-100 text-red-700", rawColor: "#dc2626" },
    maleficent: { gradient: "from-black via-[#140202] to-black", accent: "text-red-500 drop-shadow-[0_0_10px_#ee2e24]", badge: "border border-red-900 bg-red-950/40 text-red-400", rawColor: "#ef4444" }
  },

  "Ligue 1 McDonald's": {
    classic: { gradient: "from-slate-900 via-indigo-900 to-blue-900", accent: "text-blue-300", badge: "bg-blue-500/20 text-blue-100", rawColor: "#0046a8" },
    aurora: { gradient: "from-blue-50 via-indigo-50 to-slate-100", accent: "text-blue-600 font-serif italic", badge: "bg-blue-100 text-blue-700", rawColor: "#2563eb" },
    maleficent: { gradient: "from-black via-[#020b24] to-black", accent: "text-blue-400 drop-shadow-[0_0_8px_#0046a8]", badge: "border border-blue-900 bg-blue-950/30 text-blue-400", rawColor: "#3b82f6" }
  },

  "Bundesliga": {
    classic: { gradient: "from-red-700 via-black to-zinc-900", accent: "text-red-300", badge: "bg-red-500/20 text-red-100", rawColor: "#d3010c" },
    aurora: { gradient: "from-rose-100 via-red-50 to-zinc-100", accent: "text-red-700 font-serif italic", badge: "bg-red-200 text-red-800", rawColor: "#b91c1c" },
    maleficent: { gradient: "from-black via-[#260204] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#d3010c]", badge: "border border-red-900 text-red-400 bg-red-950/20", rawColor: "#f43f5e" }
  },

  "Serie A Enilive": {
    classic: { gradient: "from-blue-700 via-sky-600 to-cyan-500", accent: "text-cyan-300", badge: "bg-cyan-400/20 text-cyan-100", rawColor: "#00b2ff" },
    aurora: { gradient: "from-sky-100 via-cyan-50 to-white", accent: "text-sky-700 font-serif italic", badge: "bg-sky-100 text-sky-800", rawColor: "#0284c7" },
    maleficent: { gradient: "from-black via-[#001026] to-black", accent: "text-cyan-400 drop-shadow-[0_0_8px_#00b2ff]", badge: "border border-cyan-800 text-cyan-400 bg-cyan-950/20", rawColor: "#06b6d4" }
  },

  "Trendyol Süper Lig": {
    classic: { gradient: "from-red-700 via-rose-700 to-zinc-900", accent: "text-rose-200", badge: "bg-rose-500/20 text-rose-100", rawColor: "#ff003c" },
    aurora: { gradient: "from-rose-50 via-slate-100 to-zinc-100", accent: "text-rose-600 font-serif italic", badge: "bg-rose-100 text-rose-700", rawColor: "#e11d48" },
    maleficent: { gradient: "from-black via-[#240008] to-black", accent: "text-rose-400 drop-shadow-[0_0_8px_#ff003c]", badge: "border border-rose-900 text-rose-400", rawColor: "#f43f5e" }
  },

  "MLS": {
    classic: { gradient: "from-sky-700 via-blue-700 to-indigo-900", accent: "text-blue-200", badge: "bg-blue-500/20 text-blue-100", rawColor: "#001f5b" },
    aurora: { gradient: "from-sky-100 via-blue-50 to-indigo-50", accent: "text-blue-700 font-serif italic", badge: "bg-blue-200 text-blue-800", rawColor: "#1d4ed8" },
    maleficent: { gradient: "from-black via-[#031336] to-black", accent: "text-blue-400 drop-shadow-[0_0_8px_#001f5b]", badge: "border border-blue-800 text-blue-400", rawColor: "#60a5fa" }
  },

  "ROSHN Saudi League": {
    classic: { gradient: "from-emerald-700 via-green-500 to-lime-500", accent: "text-lime-200", badge: "bg-green-500/20 text-green-100", rawColor: "#00aa55" },
    aurora: { gradient: "from-emerald-50 via-green-50 to-lime-50", accent: "text-green-700 font-serif italic", badge: "bg-green-100 text-green-800", rawColor: "#15803d" },
    maleficent: { gradient: "from-black via-[#01240f] to-black", accent: "text-green-400 drop-shadow-[0_0_8px_#00aa55]", badge: "border border-green-900 text-green-400", rawColor: "#10b981" }
  },

  "Liga Portugal": {
    classic: { gradient: "from-emerald-700 via-teal-600 to-cyan-700", accent: "text-emerald-200", badge: "bg-emerald-500/20 text-emerald-100", rawColor: "#0d5c3a" },
    aurora: { gradient: "from-emerald-100 via-teal-50 to-cyan-50", accent: "text-emerald-700 font-serif italic", badge: "bg-emerald-200 text-emerald-800", rawColor: "#047857" },
    maleficent: { gradient: "from-black via-[#002414] to-black", accent: "text-emerald-400 drop-shadow-[0_0_8px_#0d5c3a]", badge: "border border-emerald-900 text-emerald-400", rawColor: "#34d399" }
  },

  "LPF": {
    classic: { gradient: "from-sky-500 via-cyan-500 to-blue-800", accent: "text-cyan-200", badge: "bg-cyan-500/20 text-cyan-100", rawColor: "#00b4e5" },
    aurora: { gradient: "from-sky-50 via-cyan-50 to-blue-50", accent: "text-cyan-600 font-serif italic", badge: "bg-cyan-100 text-cyan-700", rawColor: "#0891b2" },
    maleficent: { gradient: "from-black via-[#001f2b] to-black", accent: "text-cyan-400 drop-shadow-[0_0_8px_#00b4e5]", badge: "border border-cyan-900 text-cyan-400", rawColor: "#22d3ee" }
  },

  "Eredivisie": {
    classic: { gradient: "from-orange-500 via-red-500 to-red-800", accent: "text-orange-200", badge: "bg-orange-500/20 text-orange-100", rawColor: "#f05023" },
    aurora: { gradient: "from-orange-100 via-red-50 to-white", accent: "text-orange-700 font-serif italic", badge: "bg-orange-200 text-orange-800", rawColor: "#c2410c" },
    maleficent: { gradient: "from-black via-[#2b0c03] to-black", accent: "text-orange-400 drop-shadow-[0_0_8px_#f05023]", badge: "border border-orange-900 text-orange-400", rawColor: "#fb923c" }
  },

  "Liga Hrvatska": {
    classic: { gradient: "from-blue-700 via-sky-500 to-red-600", accent: "text-sky-200", badge: "bg-sky-500/20 text-sky-100", rawColor: "#184594" },
    aurora: { gradient: "from-blue-50 via-sky-50 to-red-50", accent: "text-blue-600 font-serif italic", badge: "bg-blue-100 text-blue-700", rawColor: "#2563eb" },
    maleficent: { gradient: "from-black via-[#04112b] to-black", accent: "text-sky-400 drop-shadow-[0_0_8px_#184594]", badge: "border border-blue-900 text-sky-400", rawColor: "#38bdf8" }
  },

  "Hellas Liga": {
    classic: { gradient: "from-blue-800 via-white/10 to-sky-700", accent: "text-blue-200", badge: "bg-blue-500/20 text-blue-100", rawColor: "#005bb6" },
    aurora: { gradient: "from-blue-50 via-slate-50 to-white", accent: "text-blue-700 font-serif italic", badge: "bg-blue-100 text-blue-800", rawColor: "#1d4ed8" },
    maleficent: { gradient: "from-black via-[#01142b] to-black", accent: "text-blue-400 drop-shadow-[0_0_8px_#005bb6]", badge: "border border-blue-900 text-blue-400", rawColor: "#60a5fa" }
  },

  "1A Pro League": {
    classic: { gradient: "from-yellow-500 via-orange-500 to-red-700", accent: "text-yellow-200", badge: "bg-yellow-500/20 text-yellow-100", rawColor: "#e30613" },
    aurora: { gradient: "from-yellow-50 via-orange-50 to-red-50", accent: "text-amber-700 font-serif italic", badge: "bg-amber-100 text-amber-800", rawColor: "#b45309" },
    maleficent: { gradient: "from-black via-[#260305] to-black", accent: "text-orange-400 drop-shadow-[0_0_8px_#e30613]", badge: "border border-red-950 text-red-400", rawColor: "#f97316" }
  },

  "Scottish Prem": {
    classic: { gradient: "from-blue-700 via-indigo-700 to-slate-900", accent: "text-blue-200", badge: "bg-blue-500/20 text-blue-100", rawColor: "#002d62" },
    aurora: { gradient: "from-blue-50 via-indigo-50 to-slate-100", accent: "text-indigo-700 font-serif italic", badge: "bg-indigo-100 text-indigo-800", rawColor: "#4338ca" },
    maleficent: { gradient: "from-black via-[#030d24] to-black", accent: "text-indigo-400 drop-shadow-[0_0_8px_#002d62]", badge: "border border-indigo-900 text-indigo-400", rawColor: "#818cf8" }
  },

  "United Emirates League": {
    classic: { gradient: "from-red-700 via-green-600 to-black", accent: "text-green-200", badge: "bg-green-500/20 text-green-100", rawColor: "#00732f" },
    aurora: { gradient: "from-red-50 via-green-50 to-slate-50", accent: "text-green-700 font-serif italic", badge: "bg-green-100 text-green-800", rawColor: "#15803d" },
    maleficent: { gradient: "from-black via-[#01240e] to-black", accent: "text-green-400 drop-shadow-[0_0_8px_#00732f]", badge: "border border-green-950 text-green-400", rawColor: "#4ade80" }
  },

  "Libertadores": {
    classic: { gradient: "from-yellow-500 via-amber-500 to-zinc-900", accent: "text-yellow-200", badge: "bg-yellow-500/20 text-yellow-100", rawColor: "#f6a800" },
    aurora: { gradient: "from-yellow-100 via-amber-50 to-white", accent: "text-amber-700 font-serif italic", badge: "bg-amber-100 text-amber-800", rawColor: "#b45309" },
    maleficent: { gradient: "from-black via-[#261901] to-black", accent: "text-yellow-400 drop-shadow-[0_0_8px_#f6a800]", badge: "border border-amber-900 text-amber-400", rawColor: "#facc15" }
  },

  "Česká Liga": {
    classic: { gradient: "from-red-600 via-blue-700 to-zinc-900", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#d71920" },
    aurora: { gradient: "from-red-50 via-blue-50 to-white", accent: "text-red-600 font-serif italic", badge: "bg-red-100 text-red-700", rawColor: "#dc2626" },
    maleficent: { gradient: "from-black via-[#240306] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#d71920]", badge: "border border-red-900 text-red-400", rawColor: "#f87171" }
  },

  "Ukrayina Liha": {
    classic: { gradient: "from-blue-500 via-sky-400 to-yellow-400", accent: "text-yellow-200", badge: "bg-yellow-400/20 text-yellow-100", rawColor: "#ffdd00" },
    aurora: { gradient: "from-blue-50 via-sky-50 to-yellow-50", accent: "text-sky-700 font-serif italic", badge: "bg-sky-200 text-sky-800", rawColor: "#0284c7" },
    maleficent: { gradient: "from-black via-[#1c1a01] to-black", accent: "text-yellow-400 drop-shadow-[0_0_8px_#ffdd00]", badge: "border border-yellow-900 text-yellow-400", rawColor: "#facc15" }
  },

  "Serie BKT": {
    classic: { gradient: "from-green-700 via-emerald-600 to-teal-700", accent: "text-green-200", badge: "bg-green-500/20 text-green-100", rawColor: "#165c36" },
    aurora: { gradient: "from-green-50 via-emerald-50 to-teal-50", accent: "text-emerald-700 font-serif italic", badge: "bg-emerald-100 text-emerald-800", rawColor: "#047857" },
    maleficent: { gradient: "from-black via-[#021c0e] to-black", accent: "text-emerald-400 drop-shadow-[0_0_8px_#165c36]", badge: "border border-emerald-950 text-emerald-400", rawColor: "#34d399" }
  },

  "Brack Super League": {
    classic: { gradient: "from-red-700 via-white/10 to-zinc-900", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#ee1c25" },
    aurora: { gradient: "from-red-50 via-slate-50 to-zinc-50", accent: "text-red-600 font-serif italic", badge: "bg-red-100 text-red-700", rawColor: "#dc2626" },
    maleficent: { gradient: "from-black via-[#1f0204] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#ee1c25]", badge: "border border-red-900 text-red-400", rawColor: "#ef4444" }
  },

  "Magyar Liga": {
    classic: { gradient: "from-green-700 via-red-600 to-zinc-900", accent: "text-green-200", badge: "bg-green-500/20 text-green-100", rawColor: "#008753" },
    aurora: { gradient: "from-green-50 via-red-50 to-white", accent: "text-green-700 font-serif italic", badge: "bg-green-100 text-green-800", rawColor: "#15803d" },
    maleficent: { gradient: "from-black via-[#011c10] to-black", accent: "text-green-400 drop-shadow-[0_0_8px_#008753]", badge: "border border-green-900 text-green-400", rawColor: "#22c55e" }
  },

  "EFL Championship": {
    classic: { gradient: "from-sky-700 via-blue-700 to-indigo-900", accent: "text-sky-200", badge: "bg-sky-500/20 text-sky-100", rawColor: "#1b4a9b" },
    aurora: { gradient: "from-sky-100 via-blue-50 to-slate-100", accent: "text-blue-700 font-serif italic", badge: "bg-blue-200 text-blue-800", rawColor: "#1d4ed8" },
    maleficent: { gradient: "from-black via-[#03112b] to-black", accent: "text-sky-400 drop-shadow-[0_0_8px_#1b4a9b]", badge: "border border-sky-900 text-sky-400", rawColor: "#38bdf8" }
  },

  "Eliteserien": {
    classic: { gradient: "from-sky-500 via-blue-600 to-indigo-900", accent: "text-sky-200", badge: "bg-sky-500/20 text-sky-100", rawColor: "#002f6c" },
    aurora: { gradient: "from-sky-50 via-blue-50 to-white", accent: "text-sky-700 font-serif italic", badge: "bg-sky-100 text-sky-800", rawColor: "#0284c7" },
    maleficent: { gradient: "from-black via-[#011024] to-black", accent: "text-sky-400 drop-shadow-[0_0_8px_#002f6c]", badge: "border border-sky-950 text-sky-400", rawColor: "#60a5fa" }
  },

  "3F Superliga": {
    classic: { gradient: "from-red-500 via-zinc-700 to-black", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#c90c1d" },
    aurora: { gradient: "from-red-50 via-zinc-100 to-white", accent: "text-red-600 font-serif italic", badge: "bg-red-100 text-red-700", rawColor: "#dc2626" },
    maleficent: { gradient: "from-black via-[#1c0205] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#c90c1d]", badge: "border border-red-900 text-red-400", rawColor: "#f87171" }
  },

  "LALIGA HYPERMOTION": {
    classic: { gradient: "from-zinc-800 via-slate-800 to-black", accent: "text-orange-300", badge: "bg-orange-500/20 text-orange-100", rawColor: "#ff5a00" },
    aurora: { gradient: "from-orange-50 via-slate-100 to-white", accent: "text-orange-600 font-serif italic", badge: "bg-orange-100 text-orange-700", rawColor: "#ea580c" },
    maleficent: { gradient: "from-black via-[#240d01] to-black", accent: "text-orange-400 drop-shadow-[0_0_8px_#ff5a00]", badge: "border border-orange-950 text-orange-400", rawColor: "#fb923c" }
  },

  "Bundesliga 2": {
    classic: { gradient: "from-red-800 via-zinc-900 to-black", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#df0000" },
    aurora: { gradient: "from-red-100 via-zinc-50 to-white", accent: "text-red-700 font-serif italic", badge: "bg-red-200 text-red-800", rawColor: "#b91c1c" },
    maleficent: { gradient: "from-black via-[#210202] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#df0000]", badge: "border border-red-900 text-red-400", rawColor: "#f43f5e" }
  },

  "Ligue 2 BKT": {
    classic: { gradient: "from-slate-800 via-blue-900 to-indigo-900", accent: "text-blue-200", badge: "bg-blue-500/20 text-blue-100", rawColor: "#0f2d5a" },
    aurora: { gradient: "from-slate-100 via-blue-50 to-white", accent: "text-blue-700 font-serif italic", badge: "bg-blue-200 text-blue-800", rawColor: "#1d4ed8" },
    maleficent: { gradient: "from-black via-[#020d1c] to-black", accent: "text-blue-400 drop-shadow-[0_0_8px_#0f2d5a]", badge: "border border-blue-950 text-blue-400", rawColor: "#60a5fa" }
  },

  "K League 1": {
    classic: { gradient: "from-red-600 via-blue-700 to-zinc-900", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#0b2265" },
    aurora: { gradient: "from-red-50 via-blue-50 to-slate-50", accent: "text-blue-600 font-serif italic", badge: "bg-blue-100 text-blue-700", rawColor: "#2563eb" },
    maleficent: { gradient: "from-black via-[#01091f] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#0b2265]", badge: "border border-blue-900 text-red-400", rawColor: "#3b82f6" }
  },

  "CSL": {
    classic: { gradient: "from-red-700 via-yellow-500 to-zinc-900", accent: "text-yellow-200", badge: "bg-yellow-500/20 text-yellow-100", rawColor: "#e60012" },
    aurora: { gradient: "from-red-50 via-yellow-50 to-white", accent: "text-amber-700 font-serif italic", badge: "bg-amber-100 text-amber-800", rawColor: "#d97706" },
    maleficent: { gradient: "from-black via-[#240204] to-black", accent: "text-yellow-400 drop-shadow-[0_0_8px_#e60012]", badge: "border border-red-900 text-yellow-400", rawColor: "#eab308" }
  },

  "Ö. Bundesliga": {
    classic: { gradient: "from-red-700 via-rose-600 to-zinc-900", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#f00000" },
    aurora: { gradient: "from-red-50 via-rose-50 to-white", accent: "text-red-600 font-serif italic", badge: "bg-red-100 text-red-700", rawColor: "#dc2626" },
    maleficent: { gradient: "from-black via-[#210000] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#f00000]", badge: "border border-red-950 text-red-400", rawColor: "#ef4444" }
  },

  "Sudamericana": {
    classic: { gradient: "from-orange-500 via-amber-500 to-zinc-900", accent: "text-orange-200", badge: "bg-orange-500/20 text-orange-100", rawColor: "#e17100" },
    aurora: { gradient: "from-orange-100 via-amber-50 to-white", accent: "text-amber-700 font-serif italic", badge: "bg-amber-100 text-amber-800", rawColor: "#b45309" },
    maleficent: { gradient: "from-black via-[#241201] to-black", accent: "text-orange-400 drop-shadow-[0_0_8px_#e17100]", badge: "border border-orange-950 text-orange-400", rawColor: "#f97316" }
  },

  "Allsvenskan": {
    classic: { gradient: "from-yellow-400 via-blue-500 to-indigo-800", accent: "text-yellow-200", badge: "bg-yellow-400/20 text-yellow-100", rawColor: "#004b87" },
    aurora: { gradient: "from-yellow-50 via-blue-50 to-white", accent: "text-blue-700 font-serif italic", badge: "bg-blue-100 text-blue-800", rawColor: "#1d4ed8" },
    maleficent: { gradient: "from-black via-[#000e1c] to-black", accent: "text-yellow-400 drop-shadow-[0_0_8px_#004b87]", badge: "border border-blue-900 text-yellow-400", rawColor: "#38bdf8" }
  },

  "PKO BP Ekstraklasa": {
    classic: { gradient: "from-red-600 via-white/10 to-zinc-900", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#003399" },
    aurora: { gradient: "from-blue-50 via-slate-50 to-white", accent: "text-blue-700 font-serif italic", badge: "bg-blue-100 text-blue-800", rawColor: "#1d4ed8" },
    maleficent: { gradient: "from-black via-[#010a1f] to-black", accent: "text-blue-400 drop-shadow-[0_0_8px_#003399]", badge: "border border-blue-900 text-blue-400", rawColor: "#60a5fa" }
  },

  "SUPERLIGA": {
    classic: { gradient: "from-red-700 via-blue-700 to-zinc-900", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#0038a8" },
    aurora: { gradient: "from-red-50 via-blue-50 to-zinc-100", accent: "text-blue-600 font-serif italic", badge: "bg-blue-100 text-blue-700", rawColor: "#2563eb" },
    maleficent: { gradient: "from-black via-[#010c24] to-black", accent: "text-blue-400 drop-shadow-[0_0_8px_#0038a8]", badge: "border border-blue-900 text-blue-400", rawColor: "#3b82f6" }
  },

  "Liga Cyprus": {
    classic: { gradient: "from-orange-500 via-yellow-500 to-amber-700", accent: "text-yellow-200", badge: "bg-yellow-500/20 text-yellow-100", rawColor: "#d4a017" },
    aurora: { gradient: "from-orange-50 via-yellow-50 to-white", accent: "text-amber-700 font-serif italic", badge: "bg-amber-100 text-amber-800", rawColor: "#b45309" },
    maleficent: { gradient: "from-black via-[#1c1501] to-black", accent: "text-yellow-400 drop-shadow-[0_0_8px_#d4a017]", badge: "border border-yellow-950 text-yellow-400", rawColor: "#eab308" }
  },

  "Liga Chile": {
    classic: { gradient: "from-red-700 via-blue-700 to-zinc-900", accent: "text-red-200", badge: "bg-red-500/20 text-red-100", rawColor: "#0039a6" },
    aurora: { gradient: "from-red-50 via-blue-50 to-white", accent: "text-blue-600 font-serif italic", badge: "bg-blue-100 text-blue-700", rawColor: "#2563eb" },
    maleficent: { gradient: "from-black via-[#010e26] to-black", accent: "text-red-400 drop-shadow-[0_0_8px_#0039a6]", badge: "border border-blue-900 text-red-400", rawColor: "#3b82f6" }
  },

  "A-League": {
    classic: { gradient: "from-sky-500 via-blue-700 to-indigo-900", accent: "text-sky-200", badge: "bg-sky-500/20 text-sky-100", rawColor: "#ff5c00" },
    aurora: { gradient: "from-sky-50 via-orange-50 to-white", accent: "text-orange-600 font-serif italic", badge: "bg-orange-100 text-orange-700", rawColor: "#ea580c" },
    maleficent: { gradient: "from-black via-[#240e02] to-black", accent: "text-orange-400 drop-shadow-[0_0_8px_#ff5c00]", badge: "border border-orange-950 text-orange-400", rawColor: "#f97316" }
  },

  "EFL League One": {
    classic: { gradient: "from-sky-700 via-indigo-700 to-slate-900", accent: "text-blue-200", badge: "bg-blue-500/20 text-blue-100", rawColor: "#002366" },
    aurora: { gradient: "from-sky-50 via-indigo-50 to-white", accent: "text-indigo-700 font-serif italic", badge: "bg-indigo-100 text-indigo-800", rawColor: "#4338ca" },
    maleficent: { gradient: "from-black via-[#020b1c] to-black", accent: "text-indigo-400 drop-shadow-[0_0_8px_#002366]", badge: "border border-indigo-900 text-indigo-400", rawColor: "#6366f1" }
  },

  "Liga Azerbaijan": {
    classic: { gradient: "from-sky-500 via-red-600 to-green-600", accent: "text-sky-200", badge: "bg-sky-500/20 text-sky-100", rawColor: "#0092bc" },
    aurora: { gradient: "from-sky-50 via-red-50 to-green-50", accent: "text-sky-600 font-serif italic", badge: "bg-sky-100 text-sky-700", rawColor: "#0284c7" },
    maleficent: { gradient: "from-black via-[#01171c] to-black", accent: "text-sky-400 drop-shadow-[0_0_8px_#0092bc]", badge: "border border-cyan-900 text-sky-400", rawColor: "#06b6d4" }
  },

  "Finnliiga": {
    classic: { gradient: "from-blue-600 via-sky-500 to-white/10", accent: "text-sky-200", badge: "bg-sky-500/20 text-sky-100", rawColor: "#00529b" },
    aurora: { gradient: "from-blue-50 via-sky-50 to-white", accent: "text-blue-700 font-serif italic", badge: "bg-blue-100 text-blue-800", rawColor: "#1d4ed8" },
    maleficent: { gradient: "from-black via-[#010f1c] to-black", accent: "text-sky-400 drop-shadow-[0_0_8px_#00529b]", badge: "border border-blue-900 text-sky-400", rawColor: "#38bdf8" }
  },

  "ISL": {
    classic: { gradient: "from-indigo-700 via-purple-700 to-pink-700", accent: "text-pink-200", badge: "bg-pink-500/20 text-pink-100", rawColor: "#f31262" },
    aurora: { gradient: "from-indigo-50 via-purple-50 to-pink-50", accent: "text-pink-600 font-serif italic", badge: "bg-pink-100 text-pink-700", rawColor: "#db2777" },
    maleficent: { gradient: "from-black via-[#1c010a] to-black", accent: "text-pink-400 drop-shadow-[0_0_8px_#f31262]", badge: "border border-pink-900 text-pink-400", rawColor: "#f43f5e" }
  },

  "3. Liga": {
    classic: { gradient: "from-zinc-700 via-zinc-900 to-black", accent: "text-zinc-200", badge: "bg-zinc-500/20 text-zinc-100", rawColor: "#3f3f46" },
    aurora: { gradient: "from-zinc-100 via-slate-100 to-white", accent: "text-zinc-700 font-serif italic", badge: "bg-zinc-200 text-zinc-800", rawColor: "#52525b" },
    maleficent: { gradient: "from-black via-[#0c0c0e] to-black", accent: "text-zinc-400 drop-shadow-[0_0_8px_#3f3f46]", badge: "border border-zinc-800 text-zinc-400", rawColor: "#a1a1aa" }
  },

  "EFL League Two": {
    classic: { gradient: "from-slate-700 via-indigo-700 to-black", accent: "text-indigo-200", badge: "bg-indigo-500/20 text-indigo-100", rawColor: "#4b0082" },
    aurora: { gradient: "from-slate-100 via-indigo-50 to-white", accent: "text-indigo-700 font-serif italic", badge: "bg-indigo-100 text-indigo-800", rawColor: "#6366f1" },
    maleficent: { gradient: "from-black via-[#0f011c] to-black", accent: "text-indigo-400 drop-shadow-[0_0_8px_#4b0082]", badge: "border border-indigo-950 text-indigo-400", rawColor: "#a855f7" }
  },

  "SSE Airtricity PD": {
    classic: { gradient: "from-emerald-700 via-green-600 to-teal-700", accent: "text-green-200", badge: "bg-green-500/20 text-green-100", rawColor: "#006633" },
    aurora: { gradient: "from-emerald-50 via-green-50 to-white", accent: "text-green-700 font-serif italic", badge: "bg-green-100 text-green-800", rawColor: "#15803d" },
    maleficent: { gradient: "from-black via-[#011f0f] to-black", accent: "text-green-400 drop-shadow-[0_0_8px_#006633]", badge: "border border-green-900 text-green-400", rawColor: "#22c55e" }
  },

  default: {
    classic: { gradient: "from-zinc-800 via-zinc-900 to-black", accent: "text-zinc-300", badge: "bg-zinc-500/20 text-zinc-100", rawColor: "#a1a1aa" },
    aurora: { gradient: "from-slate-100 via-zinc-100 to-gray-100", accent: "text-zinc-700 font-serif italic", badge: "bg-zinc-200 text-zinc-800", rawColor: "#71717a" },
    maleficent: { gradient: "from-black via-zinc-950 to-black", accent: "text-zinc-400", badge: "border border-zinc-800 text-zinc-400", rawColor: "#52525b" }
  }
};

// Функция парсит текущую глобальную тему и возвращает настройки под конкретную лигу
export function getLeagueTheme(name: string, globalTheme: string = "classic") {
  const league = LEAGUE_THEMES[name] ?? LEAGUE_THEMES.default;
  return league?.[globalTheme as keyof typeof league] ?? league.classic;
}

// Твои оригинальные хелперы
export function getOverallColor(overall: number) {
  if (overall >= 90) return "text-yellow-300";
  if (overall >= 85) return "text-green-400";
  if (overall >= 80) return "text-blue-400";
  if (overall >= 75) return "text-orange-400";
  return "text-zinc-400";
}

export function getBudgetColor(budget: number) {
  if (budget >= 200000000) return "text-green-300";
  if (budget >= 100000000) return "text-emerald-400";
  if (budget >= 50000000) return "text-yellow-300";
  return "text-orange-300";
}

export function getOverallCard(overall: number) {
  if (overall >= 90) return "from-yellow-400/20 to-orange-500/20 border-yellow-400/30";
  if (overall >= 85) return "from-green-400/20 to-emerald-500/20 border-green-400/30";
  if (overall >= 80) return "from-sky-400/20 to-blue-500/20 border-sky-400/30";
  if (overall >= 75) return "from-orange-400/20 to-red-500/20 border-orange-400/30";
  return "from-zinc-500/20 to-zinc-700/20 border-zinc-400/20";
}

export function getBudgetCard(budget: number) {
  if (budget >= 200000000) return "from-green-400/20 to-emerald-600/20 border-green-400/30";
  if (budget >= 100000000) return "from-emerald-400/20 to-teal-600/20 border-emerald-400/30";
  if (budget >= 50000000) return "from-yellow-400/20 to-orange-500/20 border-yellow-400/30";
  return "from-red-400/20 to-orange-600/20 border-red-400/30";
}