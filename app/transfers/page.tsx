"use client";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { getPlayerPhoto } from "@/lib/images";
import { getRatingColor, FlagImage, PlayerModal } from "@/app/lib/playerComponents";
import { getLeagueTheme } from "@/constants/themes";
import { TrendingUp, TrendingDown, Lock, Search, Wallet, Tag, X as XIcon } from "lucide-react";
import { getThemeCopy } from "@/lib/i18n";
import { HelpHint } from "@/components/HelpHint";
import { ContractPanel } from "@/components/ContractPanel";

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
  p, ui, actions, onOpen, priceLabel, subLabel, theme,
}: {
  p: any; ui: typeof THEME_UI["classic"];
  actions: { label: string; icon: any; onClick: () => void; busy?: boolean; disabled?: boolean; cls: string }[];
  onOpen: (p: any) => void; priceLabel?: string; subLabel?: string; theme?: string;
}) {
  const [imgErr, setImgErr] = useState(false);
  const ovr = p.overall ?? 75;

  return (
    <div className={`rounded-2xl transition-all ${ui.card} animate-fade-in-up ${ui.cardHover}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[160px] cursor-pointer" onClick={() => onOpen(p)}>
          <div className="w-10 h-10 shrink-0 relative">
            {!imgErr
              ? <img src={getPlayerPhoto(p.name)} alt={p.name} className="w-10 h-10 object-contain" onError={() => setImgErr(true)} />
              : <span className="text-2xl opacity-30">👤</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-black text-sm truncate ${ui.nameColor}`}>{p.name}</div>
            <div className={`text-[10px] ${ui.muted}`}>{p.position} · {subLabel}</div>
          </div>
        </div>
        <FlagImage country={p.nationality || p.nation} size={14} />
        <div className="text-center w-10">
          <span className="text-base font-black" style={{ color: getRatingColor(ovr, theme) }}>{ovr}</span>
        </div>
        <div className={`text-xs font-black w-20 text-right ${ui.muted}`}>{priceLabel ?? fmtMoney(p.market_value ?? 0)}</div>
        <div className="flex items-center gap-1.5">
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} disabled={a.busy || a.disabled}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${a.cls}`}>
              <a.icon size={12} />{a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

function AskingPriceModal({ ui, player, onCancel, onConfirm, copy }: {
  ui: typeof THEME_UI["classic"]; player: any; onCancel: () => void; onConfirm: (price: number) => void; copy: any;
}) {
  const [value, setValue] = useState(String(player.market_value ?? 1_000_000));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div className={`w-full max-w-sm rounded-2xl p-5 ${ui.card} animate-fade-in-up`} style={{ background: "var(--modal-bg, #0b0d16)" }} onClick={e => e.stopPropagation()}>
        <div className={`text-sm font-black mb-1 ${ui.nameColor}`}>{copy.transfersList} {player.name}</div>
        <div className={`text-[11px] mb-4 ${ui.muted}`}>{copy.transfersListModalMarketEstimate} {fmtMoney(player.market_value ?? 0)}</div>
        <input type="number" value={value} onChange={e => setValue(e.target.value)}
          className={`w-full px-3 py-2.5 text-sm outline-none rounded-xl mb-4 ${ui.input}`} placeholder={copy.transfersListModalPlaceholder} />
        <div className="flex gap-2">
          <button onClick={onCancel} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest ${ui.tabIdle}`}>{copy.transfersCancel}</button>
          <button onClick={() => onConfirm(Number(value))} disabled={!Number(value) || Number(value) <= 0}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40 ${ui.buyBtn}`}>{copy.transfersListModalConfirm}</button>
        </div>
      </div>
    </div>
  );
}

export default function TransfersPage() {
  const theme       = useThemeStore(s => s.theme) as keyof typeof THEME_UI;
  const ui          = THEME_UI[theme] ?? THEME_UI.classic;
  const locale      = useCareerStore(s => s.locale) || "en";
  const copy        = getThemeCopy(locale, theme);
  const matchday    = useCareerStore(s => s.matchday);
  const seasonId    = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const userClub    = selectedClub?.name || "";

  // Окно трансферов: до старта сезона (никто ещё не сыграл ни одного тура —
  // matchday счётчик остаётся на 1, пока тур не сыгран) и зимнее окно
  // 20-25 тур. Раньше окно ошибочно было открыто турами 1-8, то есть уже
  // ПОСЛЕ старта сезона — трансферы в разгар чемпионата были доступны,
  // хотя в реальном футболе так не делается.
  const preseasonOpen = matchday === 1;
  const winterOpen = matchday >= 20 && matchday <= 25;
  const isOpen     = preseasonOpen || winterOpen;
  const windowLabel = preseasonOpen ? copy.transfersPreseasonWindow : winterOpen ? copy.transfersWinterWindow : copy.transfersClosed;
  const nextOpen    = matchday < 20 ? copy.transfersNextOpenWinter : copy.transfersNextOpenPreseason;

  const [tab, setTab] = useState<"market" | "squad" | "listings" | "agents">("market");
  const [budget, setBudget] = useState<number | null>(null);
  const [market, setMarket] = useState<any[]>([]);
  const [squad, setSquad] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [signingAgent, setSigningAgent] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recalibrating, setRecalibrating] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [modalPlayer, setModalPlayer] = useState<any | null>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [listingTarget, setListingTarget] = useState<any | null>(null);

  const openModal = useCallback((p: any) => { setModalClosing(false); setModalPlayer(p); }, []);
  const closeModal = useCallback(() => {
    setModalClosing(true);
    setTimeout(() => { setModalPlayer(null); setModalClosing(false); }, 280);
  }, []);

  const loadAll = useCallback(async () => {
    if (!seasonId || !userClub) return;
    setLoading(true);
    try {
      // Карьеры, начатые до появления финансовой системы, застряли на budget=0 —
      // тихо чиним один раз перед чтением баланса (безопасно, трогает только
      // клубы, у которых budget=0 и ещё не было ни одной операции).
      await fetch("/api/season/repair-budget", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId }),
      }).catch(() => {});

      const [standingsRes, marketRes, squadRes, historyRes, listingsRes, agentsRes] = await Promise.all([
        fetch(`/api/standings?seasonId=${seasonId}`),
        fetch(`/api/transfers/market?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`),
        fetch(`/api/players?club=${encodeURIComponent(userClub)}&seasonId=${seasonId}`),
        fetch(`/api/transfers/history?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`),
        fetch(`/api/transfers/listings?seasonId=${seasonId}`),
        fetch(`/api/contracts/free-agents?seasonId=${seasonId}`),
      ]);
      if (standingsRes.ok) {
        const standings = await standingsRes.json();
        const own = Array.isArray(standings) ? standings.find((s: any) => s.club_id === userClub) : null;
        setBudget(own?.budget ?? 0);
      }
      if (marketRes.ok) setMarket((await marketRes.json()).players ?? []);
      if (squadRes.ok) setSquad(await squadRes.json());
      if (historyRes.ok) setHistory((await historyRes.json()).transfers ?? []);
      if (agentsRes.ok) setFreeAgents((await agentsRes.json()).agents ?? []);
      if (listingsRes.ok) {
        const ls = (await listingsRes.json()).listings ?? [];
        setListings(ls);
        // Отмечаем все текущие лоты как просмотренные — снимает бейдж в сайдбаре
        const ids = ls.map((l: any) => l.id);
        localStorage.setItem(`seen_listings_${seasonId}`, JSON.stringify(ids));
      }
    } catch (e) { console.error("Transfers load failed", e); }
    setLoading(false);
  }, [seasonId, userClub]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredMarket = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return market;
    return market.filter((p: any) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
  }, [market, search]);

  const filteredFreeAgents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return freeAgents;
    return freeAgents.filter((p: any) => p.playerName.toLowerCase().includes(q));
  }, [freeAgents, search]);

  const filteredSquad = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return squad;
    return squad.filter((p: any) => p.name.toLowerCase().includes(q));
  }, [squad, search]);

  const myListings = useMemo(() => listings.filter(l => l.seller_club === userClub), [listings, userClub]);
  const otherListings = useMemo(() => {
    const q = search.toLowerCase().trim();
    let base = listings.filter(l => l.seller_club !== userClub);
    if (q) base = base.filter(l => l.player_name.toLowerCase().includes(q) || l.seller_club.toLowerCase().includes(q));
    return base;
  }, [listings, userClub, search]);

  // Лоты в БД хранят только player_id/player_name — остальные данные (оверолл,
  // позиция, флаг) подтягиваем из уже загруженных market/squad, чтобы не дублировать
  // в БД то, что и так есть в CSV.
  const playersById = useMemo(() => {
    const map: Record<string, any> = {};
    [...market, ...squad].forEach(p => { map[p.id] = p; });
    return map;
  }, [market, squad]);
  const enrichListing = (l: any) => ({
    ...(playersById[l.player_id] ?? { id: l.player_id, name: l.player_name, overall: 0, position: "?" }),
    id: l.player_id, name: l.player_name,
  });

  const showToast = (text: string, kind: "ok" | "err") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRecalibrate = async () => {
    if (!seasonId) return;
    setRecalibrating(true);
    try {
      const res = await fetch("/api/season/recalibrate-budget", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId }),
      });
      if (res.ok) { showToast("Budgets recalculated for all clubs", "ok"); await loadAll(); }
      else showToast("Recalculation failed", "err");
    } catch (e) { showToast("Recalculation failed", "err"); }
    setRecalibrating(false);
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

  const handleQuickSell = async (p: any) => {
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
      else { showToast(`Quick-sold ${p.name} for ${fmtMoney(data.fee)} (-${data.discountApplied}%)`, "ok"); await loadAll(); }
    } catch (e) { showToast("Sale failed", "err"); }
    setBusyId(null);
  };

  const handleConfirmListing = async (price: number) => {
    if (!seasonId || !listingTarget) return;
    const p = listingTarget;
    setListingTarget(null);
    setBusyId(p.id);
    try {
      const res = await fetch("/api/transfers/list", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, sellerClubId: userClub, playerId: p.id, askingPrice: price }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Listing failed", "err"); }
      else { showToast(`${p.name} listed for ${fmtMoney(price)}`, "ok"); await loadAll(); }
    } catch (e) { showToast("Listing failed", "err"); }
    setBusyId(null);
  };

  const handleCancelListing = async (listing: any) => {
    if (!seasonId) return;
    setBusyId(listing.id);
    try {
      const res = await fetch("/api/transfers/cancel-listing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, listingId: listing.id, clubId: userClub }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to cancel", "err"); }
      else { showToast(`Listing pulled from the market`, "ok"); await loadAll(); }
    } catch (e) { showToast("Failed to cancel", "err"); }
    setBusyId(null);
  };

  const handleBuyListing = async (listing: any) => {
    if (!seasonId) return;
    setBusyId(listing.id);
    try {
      const res = await fetch("/api/transfers/buy-listing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, buyerClubId: userClub, listingId: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Purchase failed", "err"); }
      else { showToast(`Signed ${data.playerName} for ${fmtMoney(data.fee)}`, "ok"); await loadAll(); }
    } catch (e) { showToast("Purchase failed", "err"); }
    setBusyId(null);
  };

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        {/* ── Header ── */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>{copy.transfersHeaderLabel}</div>
            <h1 className="text-2xl font-black">{windowLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${ui.pill}`}>
              <Wallet size={14} />
              <span className="text-xs font-black uppercase tracking-widest">
                {budget === null ? "…" : fmtMoney(budget)}
              </span>
            </div>
            <button onClick={handleRecalibrate} disabled={recalibrating}
              title="Пересчитать бюджет по текущей формуле цен"
              className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${ui.tabIdle}`}>
              {recalibrating ? "…" : copy.transfersRecalculate}
            </button>
          </div>
        </div>

        {!isOpen ? (
          <div className={`rounded-2xl p-10 text-center ${ui.card} animate-fade-in-up`}>
            <Lock size={40} className={`mx-auto mb-4 ${ui.muted}`} />
            <div className="text-lg font-black mb-2">{copy.transfersClosed}</div>
            <div className={`text-sm ${ui.muted}`}>{nextOpen}</div>
          </div>
        ) : (
          <>
            {/* ── Tabs ── */}
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <button onClick={() => setTab("market")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "market" ? ui.tabActive : ui.tabIdle}`}>
                {copy.transfersMarketTab}
              </button>
              <button onClick={() => setTab("squad")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "squad" ? ui.tabActive : ui.tabIdle}`}>
                {copy.transfersSquadTab} ({squad.length})
              </button>
              <button onClick={() => setTab("listings")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "listings" ? ui.tabActive : ui.tabIdle}`}>
                {copy.transfersListingsTab} ({otherListings.length})
              </button>
              <button onClick={() => setTab("agents")}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "agents" ? ui.tabActive : ui.tabIdle}`}>
                🆓 {locale === "ru" ? "Агенты" : "Free Agents"} ({freeAgents.length})
              </button>
              {tab === "squad" && (
                <HelpHint id="transfers-squad-actions" theme={theme as any}
                  title={locale === "ru" ? "Продажа игрока" : "Selling a player"}
                  text={locale === "ru"
                    ? "Быстрая продажа — мгновенно, но со скидкой от рыночной цены (чем выше рейтинг, тем больше скидка). Выставить на рынок — цену назначаешь сам, но ждёшь покупателя."
                    : "Quick Sell — instant, but at a discount from market value (bigger stars get bigger discounts). List for Sale — you set the price, but wait for a buyer."} />
              )}
              {tab === "market" && (
                <HelpHint id="transfers-market-buy" theme={theme as any}
                  title={locale === "ru" ? "Трансферный рынок" : "Transfer market"}
                  text={locale === "ru"
                    ? "Покупка игрока автоматически создаёт ему новый контракт в твоём клубе (старый контракт с прежним клубом закрывается)."
                    : "Buying a player automatically creates a fresh contract at your club (their old club's contract is closed)."} />
              )}
              {tab === "agents" && (
                <HelpHint id="transfers-agents" theme={theme as any}
                  title={locale === "ru" ? "Свободные агенты" : "Free agents"}
                  text={locale === "ru"
                    ? "Игроки без клуба — контракт истёк и не был продлён. Подписать можно без трансферной суммы, только зарплата и срок по переговорам."
                    : "Players without a club — their contract expired and wasn't renewed. Sign them with no transfer fee, just negotiate wage and length."} />
              )}
            </div>

            {/* ── Search ── */}
            <div className="relative mb-4 max-w-sm">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={tab === "squad" ? copy.transfersSearchSquad : copy.transfersSearchMarket}
                className={`w-full pl-9 pr-4 py-2.5 text-sm outline-none rounded-xl ${ui.input}`} />
            </div>

            {loading ? (
              <div className={`text-center py-16 text-sm ${ui.muted}`}>{copy.commonLoading}</div>
            ) : tab === "market" ? (
              <div className="space-y-1.5">
                {filteredMarket.length === 0 && (
                  <div className={`text-center py-10 text-sm ${ui.muted}`}>{copy.transfersNoPlayers}</div>
                )}
                {filteredMarket.map((p: any) => (
                  <TransferPlayerRow key={p.id} p={p} ui={ui} onOpen={openModal} subLabel={p.team} theme={theme}
                    actions={[{
                      label: copy.transfersBuy, icon: TrendingUp, cls: ui.buyBtn,
                      busy: busyId === p.id, disabled: budget !== null && (p.market_value ?? 0) > budget,
                      onClick: () => handleBuy(p),
                    }]} />
                ))}
              </div>
            ) : tab === "squad" ? (
              <div className="space-y-1.5">
                {filteredSquad.length === 0 && (
                  <div className={`text-center py-10 text-sm ${ui.muted}`}>{copy.transfersNoPlayers}</div>
                )}
                {filteredSquad.map((p: any) => (
                  <TransferPlayerRow key={p.id} p={p} ui={ui} onOpen={openModal} subLabel={`${p.age} y.o.`} theme={theme}
                    actions={[
                      { label: copy.transfersQuickSell, icon: TrendingDown, cls: ui.sellBtn, busy: busyId === p.id, onClick: () => handleQuickSell(p) },
                      { label: copy.transfersList, icon: Tag, cls: ui.buyBtn, busy: busyId === p.id, disabled: myListings.some(l => l.player_id === p.id), onClick: () => setListingTarget(p) },
                    ]} />
                ))}
              </div>
            ) : tab === "listings" ? (
              <div className="space-y-6">
                {myListings.length > 0 && (
                  <div>
                    <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>{copy.transfersMyListings}</div>
                    <div className="space-y-1.5">
                      {myListings.map((l: any) => (
                        <TransferPlayerRow key={l.id} p={enrichListing(l)}
                          ui={ui} onOpen={openModal} subLabel="listed by you" priceLabel={fmtMoney(l.asking_price)} theme={theme}
                          actions={[{ label: copy.transfersCancel, icon: XIcon, cls: ui.sellBtn, busy: busyId === l.id, onClick: () => handleCancelListing(l) }]} />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>{copy.transfersOpenListings}</div>
                  {otherListings.length === 0 ? (
                    <div className={`text-center py-10 text-sm ${ui.muted}`}>{copy.transfersNoListings}</div>
                  ) : (
                    <div className="space-y-1.5">
                      {otherListings.map((l: any) => (
                        <TransferPlayerRow key={l.id} p={enrichListing(l)}
                          ui={ui} onOpen={openModal} subLabel={l.seller_club} priceLabel={fmtMoney(l.asking_price)} theme={theme}
                          actions={[{ label: copy.transfersBuy, icon: TrendingUp, cls: ui.buyBtn, busy: busyId === l.id, disabled: budget !== null && l.asking_price > budget, onClick: () => handleBuyListing(l) }]} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredFreeAgents.length === 0 && (
                  <div className={`text-center py-10 text-sm ${ui.muted}`}>
                    {locale === "ru" ? "Пока свободных агентов нет — они появляются, когда у кого-то истекает контракт." : "No free agents right now — they appear when someone's contract expires."}
                  </div>
                )}
                {filteredFreeAgents.map((a: any) => (
                  <div key={a.contractId} className={`rounded-2xl p-3 flex items-center gap-3 transition-all card-lift animate-fade-in-up ${ui.card} ${ui.cardHover}`}>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${ui.nameColor}`}>{a.playerName}</div>
                      <div className={`text-[11px] ${ui.muted}`}>{a.position} · {a.overall} OVR · {a.age} y.o.</div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ color: getRatingColor(a.overall, theme), background: `${getRatingColor(a.overall, theme)}18` }}>
                      {a.overall}
                    </span>
                    <button onClick={() => setSigningAgent(a)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${ui.buyBtn}`}>
                      🆓 {locale === "ru" ? "Подписать" : "Sign"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Recent activity ── */}
            {history.length > 0 && (
              <div className="mt-8">
                <div className={`text-[10px] uppercase tracking-widest mb-3 ${ui.muted}`}>{copy.transfersRecentActivity}</div>
                <div className={`rounded-2xl divide-y ${ui.card} animate-fade-in-up ${theme === "aurora" ? "divide-pink-100" : "divide-white/[0.06]"}`}>
                  {history.slice(0, 8).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span className={ui.nameColor}>
                        <span className="font-black">{t.player_name}</span>{" "}
                        {t.to_club === userClub ? (locale === "ru" ? "подписан из" : "signed from") : (locale === "ru" ? "продан в" : "sold to")}{" "}
                        {t.to_club === userClub ? (t.from_club ?? "free agent") : t.to_club}
                        {t.type === "quick_sell" && <span className={ui.muted}> · quick sell</span>}
                        {t.type === "listing" && <span className={ui.muted}> · market listing</span>}
                      </span>
                      <span className={`font-black ${ui.muted}`}>{fmtMoney(t.fee)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Player card modal ── */}
        {modalPlayer && (
          <PlayerModal
            player={modalPlayer}
            clubName={modalPlayer.team ?? userClub}
            clubColor={getLeagueTheme(modalPlayer.league || selectedClub?.league || "Premier League", theme).rawColor}
            theme={theme}
            onClose={closeModal}
            isClosing={modalClosing}
          />
        )}

        {/* ── Asking price modal ── */}
        {listingTarget && (
          <AskingPriceModal ui={ui} player={listingTarget} onCancel={() => setListingTarget(null)} onConfirm={handleConfirmListing} copy={copy} />
        )}

        {/* ── Подписание свободного агента ── */}
        {signingAgent && (
          <ContractPanel
            theme={theme as any}
            locale={locale as any}
            isFreeAgent
            signingClubId={userClub}
            player={{
              contractId: signingAgent.contractId,
              playerId: signingAgent.playerId,
              playerName: signingAgent.playerName,
              overall: signingAgent.overall,
              age: signingAgent.age,
              currentWage: 0,
              currentYears: 0,
              currentRole: signingAgent.squadRole ?? "rotation",
              happiness: signingAgent.happiness ?? 50,
            }}
            onClose={() => setSigningAgent(null)}
            onSigned={() => {
              setSigningAgent(null);
              setToast({ text: locale === "ru" ? `${signingAgent.playerName} подписан!` : `${signingAgent.playerName} signed!`, kind: "ok" });
              loadAll();
            }}
          />
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
