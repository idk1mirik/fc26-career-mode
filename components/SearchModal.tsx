"use client";
// components/SearchModal.tsx — общий поиск по игрокам и клубам (Ctrl+K / кнопка в сайдбаре).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pageTheme } from "@/lib/pageTheme";
import { getClubLogo } from "@/data/clublogos";
import { getFx } from "@/lib/i18nFx";
import { icons } from "@/lib/themeFlavor";
import { Stars } from "@/components/ThemeBits";

export function SearchModal({ open, onClose, seasonId, theme, locale }: { open: boolean; onClose: () => void; seasonId: string | null; theme: string; locale: "en" | "ru" }) {
  const t = pageTheme(theme);
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const ru = locale === "ru";
  const isM = theme === "maleficent";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ players: any[]; clubs: any[] }>({ players: [], clubs: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(""); setRes({ players: [], clubs: [] }); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setRes({ players: [], clubs: [] }); return; }
    setLoading(true);
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}${seasonId ? `&seasonId=${seasonId}` : ""}`)
        .then(r => r.ok ? r.json() : null).then(d => { if (d) setRes(d); }).catch(() => {}).finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(id);
  }, [q, open, seasonId]);

  if (!open) return null;
  const go = (path: string) => { onClose(); router.push(path); };

  return (
    <div className={`fixed inset-0 z-[1400] flex items-start justify-center p-4 pt-[12vh] ${t.overlay}`} onClick={onClose}>
      <div className={`w-full max-w-lg shadow-2xl ${t.panel}`} style={t.font} onClick={e => e.stopPropagation()}>
        <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: t.accent }}>{ic.search}</span>
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
          placeholder={fx.srchPlaceholder}
          className={`w-full pl-10 pr-4 py-3.5 text-sm outline-none ${t.input} !rounded-b-none`} />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <div className={`text-center text-xs py-6 ${t.muted}`}>{fx.srchMin}</div>
          ) : loading && res.players.length + res.clubs.length === 0 ? (
            <div className={`text-center text-xs py-6 ${t.muted}`}>…</div>
          ) : res.players.length + res.clubs.length === 0 ? (
            <div className={`text-center text-xs py-6 ${t.muted}`}>{fx.srchNone}</div>
          ) : (
            <>
              {res.clubs.length > 0 && <div className={`px-2 pt-2 pb-1 text-[10px] ${t.eyebrow} ${t.muted}`}>{fx.srchClubs}</div>}
              {res.clubs.map((c: any) => (
                <button key={c.id} onClick={() => go(`/clubs/${encodeURIComponent(c.id)}`)} className={`w-full flex items-center gap-3 px-3 py-2 ${isM ? "" : "rounded-lg"} ${t.hover} text-left`}>
                  <img src={getClubLogo(c.name)} alt="" className="w-6 h-6 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                  <span className="text-sm font-bold truncate flex-1">{c.name}</span>
                  <span className={`text-[10px] truncate max-w-[40%] ${t.muted}`}>{c.league}</span>
                </button>
              ))}
              {res.players.length > 0 && <div className={`px-2 pt-3 pb-1 text-[10px] ${t.eyebrow} ${t.muted}`}>{fx.srchPlayers}</div>}
              {res.players.map((p: any) => (
                <button key={p.id} onClick={() => go(`/clubs/${encodeURIComponent(p.team)}`)} className={`w-full flex items-center gap-3 px-3 py-2 ${isM ? "" : "rounded-lg"} ${t.hover} text-left`}>
                  <span className="w-9 text-center shrink-0">
                    <span className="block text-sm font-black leading-none" style={{ color: t.accent }}>{p.overall}</span>
                    <Stars value={Math.max(0, (p.overall - 55) / 8)} theme={theme} size={6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className={`text-[10px] truncate ${t.muted}`}>{p.position} · {p.age} {ru ? "л." : "y.o."} · {p.team}</div>
                  </div>
                  <img src={getClubLogo(p.team)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
