"use client";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { getPlayerPhoto } from "@/lib/images";
import { getRatingColor, FlagImage } from "@/app/lib/playerComponents";
import { TrendingUp, TrendingDown, Lock, Search, Wallet } from "lucide-react";

// ─── Тема — тот же паттерн THEME_UI, что и на странице состава/тактики ──────
const THEME_UI = {
  classic: {
    bg: "bg-[#04060f]", text: "text-white", muted: "text-white/40",
    nameColor: "text-white",
    card: "bg-white/[0.03] border border-white/[0.07]",
    cardHover: "hover:bg-white/[0.06]",
    input: "bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30",
    tabActive: "bg-white/20 text-white border border-white/20",
    tabIdle: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]",
    font: {},
    pill: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    buyBtn: "bg-emerald-500 text-black hover:bg-emerald-400",
    sellBtn: "bg-red-500/90 text-white hover:bg-red-500",
  },
  aurora: {
    bg: "bg-[#fef6ff]", text: "text-pink-950", muted: "text-pink-900/40",
    nameColor: "text-pink-950",
    card: "bg-white/70 border border-pink-100",
    cardHover: "hover:bg-white/90",
    input: "bg-white border border-pink-100 text-pink-950 placeholder-pink-300",
    tabActive: "bg-violet-500 text-white",
    tabIdle: "bg-pink-50 text-pink-500 hover:bg-pink-100",
    font: { fontFamily: "'Fraunces',serif" },
    pill: "bg-violet-100 text-violet-600 border border-violet-200",
    buyBtn: "bg-violet-500 text-white hover:bg-violet-600",
    sellBtn: "bg-pink-400 text-white hover:bg-pink-500",
  },
  maleficent: {
    bg: "bg-[#04000a]", text: "text-purple-100", muted: "text-purple-500/40",
    nameColor: "text-fuchsia-200",
    card: "bg-black/60 border border-purple-900/40",
    cardHover: "hover:bg-purple-950/30",
    input: "bg-black/40 border border-purple-900/40 text-fuchsia-300 placeholder-purple-800 font-mono",
    tabActive: "bg-fuchsia-900/40 border border-fuchsia-700 text-fuchsia-300 font-mono",
    tabIdle: "bg-purple-950/20 text-purple-500/50 hover:bg-purple-950/40 font-mono",
    font: { fontFamily: "'Share Tech Mono',monospace" },
    pill: "bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-900/50 font-mono",
    buyBtn: "bg-fuchsia-600 text-white hover:bg-fuchsia-500 rounded-none font-mono uppercase tracking-widest",
    sellBtn: "bg-purple-900/60 text-fuchsia-300 hover:bg-purple-900 rounded-none font-mono uppercase tracking-widest",
  },
};

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

const TransferPlayerRow = memo(function TransferPlayerRow({
  p, ui, mode, onAction, busy, disabled,
}: {
  p: any; ui: typeof THEME_UI["classic"]; mode: "buy" | "sell";
  onAction: (p: any) => void; busy: boolean; disabled?: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const ovr = p.overall ?? 75;
  const btnCls = mode === "buy" ? ui.buyBtn : ui.sellBtn;
  const btnLabel = mode === "buy" ? "Buy" : "Sell";
  const Icon = mode === "buy" ? TrendingUp : TrendingDown;

  return (
    <div className={`rounded-2xl transition-all ${ui.card} ${ui.cardHover}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="w-10 h-10 shrink-0 relative">
          {!imgErr
            ? <img src={getPlayerPhoto(p.name)} alt={p.name} className="w-10 h-10 object-contain" onError={() => setImgErr(true)} />
            : <span className="text-2xl opacity-30">👤</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-black text-sm truncate ${ui.nameColor}`}>{p.name}</div>
          <div className={`text-[10px] ${ui.muted}`}>
            {p.position} · {mode === "buy" ? p.team : p.age + " y.o."}
          </div>
        </div>
        <FlagImage country={p.nationality || p.nation} size={14} />
        <div className="text-center w-10">
          <span className="text-base font-black" style={{ color: getRatingColor(ovr) }}>{ovr}</span>
        </div>
        <div className={`text-xs font-black w-20 text-right ${ui.muted}`}>{fmtMoney(p.market_value ?? 0)}</div>
        <button
          onClick={() => onAction(p)}
          disabled={busy || disabled}
          className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnCls}`}
        >
          <Icon size={12} />{btnLabel}
        </button>
      </div>
    </div>
  );
});

export default function TransfersPage() {
  const theme       = useThemeStore(s => s.theme) as keyof typeof THEME_UI;
  const ui          = THEME_UI[theme] ?? THEME_UI.classic;
  const matchday    = useCareerStore(s => s.matchday);
  const seasonId    = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const userClub    = selectedClub?.name || "";

  // ТО открывается на туре 1-8 (лето) и 20-24 (зима) — сохранена существующая логика окна
  const summerOpen = matchday >= 1 && matchday <= 8;
  const winterOpen = matchday >= 20 && matchday <= 24;
  const isOpen     = summerOpen || winterOpen;
  const windowLabel = summerOpen ? "Summer Window" : winterOpen ? "Winter Window" : "Transfer Window Closed";
  const nextOpen    = matchday < 20 ? "Opens again at Matchday 20 (January)" : "Opens next season";

  const [tab, setTab] = useState<"market" | "squad">("market");
  const [budget, setBudget] = useState<number | null>(null);
  const [market, setMarket] = useState<any[]>([]);
  const [squad, setSquad] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const loadAll = useCallback(async () => {
    if (!seasonId || !userClub) return;
    setLoading(true);
    try {
      const [standingsRes, marketRes, squadRes, historyRes] = await Promise.all([
        fetch(`/api/standings?seasonId=${seasonId}`),
        fetch(`/api/transfers/market?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`),
        fetch(`/api/players?club=${encodeURIComponent(userClub)}&seasonId=${seasonId}`),
        fetch(`/api/transfers/history?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`),
      ]);
      if (standingsRes.ok) {
        const standings = await standingsRes.json();
        const own = Array.isArray(standings) ? standings.find((s: any) => s.club_id === userClub) : null;
        setBudget(own?.budget ?? 0);
      }
      if (marketRes.ok) setMarket((await marketRes.json()).players ?? []);
      if (squadRes.ok) setSquad(await squadRes.json());
      if (historyRes.ok) setHistory((await historyRes.json()).transfers ?? []);
    } catch (e) { console.error("Transfers load failed", e); }
    setLoading(false);
  }, [seasonId, userClub]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredMarket = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return market;
    return market.filter((p: any) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
  }, [market, search]);

  const filteredSquad = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return squad;
    return squad.filter((p: any) => p.name.toLowerCase().includes(q));
  }, [squad, search]);

  const showToast = (text: string, kind: "ok" | "err") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3500);
  };

  const handleBuy = async (p: any) => {
    if (!seasonId) return;
    setBusyId(p.id);
    try {
      const res = await fetch("/api/transfers/buy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, buyerClubId: userClub, playerId: p.id }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Transfer failed", "err"); }
      else { showToast(`Signed ${p.name} for ${fmtMoney(data.fee)}`, "ok"); await loadAll(); }
    } catch (e) { showToast("Transfer failed", "err"); }
    setBusyId(null);
  };

  const handleSell = async (p: any) => {
    if (!seasonId) return;
    if (squad.length <= 15) { showToast("Squad too small to sell — need at least 15 players", "err"); return; }
    setBusyId(p.id);
    try {
      const res = await fetch("/api/transfers/sell", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, sellerClubId: userClub, playerId: p.id }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Sale failed", "err"); }
      else { showToast(`Sold ${p.name} for ${fmtMoney(data.fee)}`, "ok"); await loadAll(); }
    } catch (e) { showToast("Sale failed", "err"); }
    setBusyId(null);
  };

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        {/* ── Header ── */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>Transfers</div>
            <h1 className="text-2xl font-black">{windowLabel}</h1>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${ui.pill}`}>
            <Wallet size={14} />
            <span className="text-xs font-black uppercase tracking-widest">
              {budget === null ? "…" : fmtMoney(budget)}
            </span>
          </div>
        </div>

        {!isOpen ? (
          <div className={`rounded-2xl p-10 text-center ${ui.card}`}>
            <Lock size={40} className={`mx-auto mb-4 ${ui.muted}`} />
            <div className="text-lg font-black mb-2">Transfer Window Closed</div>
            <div className={`text-sm ${ui.muted}`}>{nextOpen}</div>
          </div>
        ) : (
          <>
            {/* ── Tabs ── */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTab("market")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "market" ? ui.tabActive : ui.tabIdle}`}>
                Market
              </button>
              <button onClick={() => setTab("squad")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "squad" ? ui.tabActive : ui.tabIdle}`}>
                My Squad ({squad.length})
              </button>
            </div>

            {/* ── Search ── */}
            <div className="relative mb-4 max-w-sm">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={tab === "market" ? "Search players or clubs..." : "Search your squad..."}
                className={`w-full pl-9 pr-4 py-2.5 text-sm outline-none rounded-xl ${ui.input}`} />
            </div>

            {loading ? (
              <div className={`text-center py-16 text-sm ${ui.muted}`}>Loading...</div>
            ) : tab === "market" ? (
              <div className="space-y-1.5">
                {filteredMarket.length === 0 && (
                  <div className={`text-center py-10 text-sm ${ui.muted}`}>No players found</div>
                )}
                {filteredMarket.map((p: any) => (
                  <TransferPlayerRow key={p.id} p={p} ui={ui} mode="buy" busy={busyId === p.id}
                    disabled={budget !== null && (p.market_value ?? 0) > budget}
                    onAction={handleBuy} />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredSquad.length === 0 && (
                  <div className={`text-center py-10 text-sm ${ui.muted}`}>No players found</div>
                )}
                {filteredSquad.map((p: any) => (
                  <TransferPlayerRow key={p.id} p={p} ui={ui} mode="sell" busy={busyId === p.id}
                    onAction={handleSell} />
                ))}
              </div>
            )}

            {/* ── Recent activity ── */}
            {history.length > 0 && (
              <div className="mt-8">
                <div className={`text-[10px] uppercase tracking-widest mb-3 ${ui.muted}`}>Recent Activity</div>
                <div className={`rounded-2xl divide-y ${ui.card} ${theme === "aurora" ? "divide-pink-100" : "divide-white/[0.06]"}`}>
                  {history.slice(0, 8).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span className={ui.nameColor}>
                        <span className="font-black">{t.player_name}</span>{" "}
                        {t.to_club === userClub ? "signed from" : "sold to"}{" "}
                        {t.to_club === userClub ? (t.from_club ?? "free agent") : t.to_club}
                      </span>
                      <span className={`font-black ${ui.muted}`}>{fmtMoney(t.fee)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Toast ── */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-black shadow-2xl ${
            toast.kind === "ok" ? "bg-emerald-500 text-black" : "bg-red-500 text-white"
          }`}>
            {toast.text}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
