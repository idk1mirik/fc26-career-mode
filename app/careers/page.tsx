"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { pageTheme } from "@/lib/pageTheme";
import { getClubLogo } from "@/data/clublogos";
import { seasonLabel } from "@/lib/seasonLabel";
import { readSlots, snapshotFromStore, upsertSlot, deleteSlot, exportSlotsJson, importSlotsJson, type CareerSlot } from "@/lib/careerSlots";

// Несколько карьер: сохранить текущую в слот, загрузить другую, перенести файлом.
export default function CareersPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const themeRaw = useThemeStore(s => s.theme);
  const locale = (useCareerStore(s => s.locale) || "en") as "en" | "ru";
  const ru = locale === "ru";
  const currentSeasonId = useCareerStore(s => s.seasonId);
  const [slots, setSlots] = useState<CareerSlot[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { useCareerStore.persist.rehydrate(); useThemeStore.persist.rehydrate(); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) setSlots(readSlots()); }, [hydrated]);
  if (!hydrated) return null;
  const t = pageTheme(themeRaw);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const saveCurrent = () => {
    const st = useCareerStore.getState() as any;
    if (!st.seasonId) { flash(ru ? "Нет активной карьеры" : "No active career"); return; }
    upsertSlot(snapshotFromStore(st));
    setSlots(readSlots());
    flash(ru ? "Карьера сохранена в слот" : "Career saved to slot");
  };

  const load = async (slot: CareerSlot) => {
    // Сначала сохраняем текущую (если она другая), чтобы ничего не потерять при переключении
    const cur = useCareerStore.getState() as any;
    if (cur.seasonId && cur.seasonId !== slot.id) upsertSlot(snapshotFromStore(cur));
    useCareerStore.setState({ ...slot.state, lineupConfirmed: false, tacticConfirmed: false } as any);
    // Актуальный тур берём из БД: слот мог быть сохранён давно
    try {
      const r = await fetch(`/api/season?id=${slot.state.seasonId}`);
      if (r.ok) { const s = await r.json(); useCareerStore.setState({ matchday: s.matchday ?? slot.matchday, seasonNum: s.season_num ?? slot.seasonNum } as any); }
      else if (r.status === 404) { flash(ru ? "Эта карьера больше не существует в базе" : "This career no longer exists in the database"); return; }
    } catch { /* офлайн — берём сохранённые значения */ }
    router.push("/dashboard");
  };

  const remove = (slot: CareerSlot) => {
    if (!window.confirm(ru ? `Удалить слот «${slot.name}»? Сама карьера в базе останется.` : `Delete slot "${slot.name}"? The career itself stays in the database.`)) return;
    deleteSlot(slot.id); setSlots(readSlots());
  };

  const doExport = () => {
    const blob = new Blob([exportSlotsJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "fc26-careers.json"; a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try { const n = importSlotsJson(await f.text()); setSlots(readSlots()); flash(ru ? `Импортировано слотов: ${n}` : `Slots imported: ${n}`); }
    catch { flash(ru ? "Не удалось прочитать файл" : "Could not read the file"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${t.text}`} style={t.font}>
        <div className={`text-[10px] uppercase tracking-widest mb-1 ${t.muted}`}>{ru ? "Слоты сохранений" : "Save slots"}</div>
        <h1 className="text-2xl md:text-3xl font-display font-black mb-5">{ru ? "Карьеры" : "Careers"}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={saveCurrent} className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide ${t.btn}`}>💾 {ru ? "Сохранить текущую" : "Save current"}</button>
          <button onClick={doExport} className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide ${t.btnGhost}`}>⬇ {ru ? "Экспорт" : "Export"}</button>
          <button onClick={() => fileRef.current?.click()} className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide ${t.btnGhost}`}>⬆ {ru ? "Импорт" : "Import"}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => doImport(e.target.files?.[0])} />
        </div>
        {msg && <div className={`mb-4 px-4 py-2.5 text-sm font-bold ${t.cardAlt}`}>{msg}</div>}

        {slots.length === 0 ? (
          <div className={`py-14 text-center text-sm ${t.card} ${t.muted}`}>{ru ? "Слотов пока нет — сохрани текущую карьеру" : "No slots yet — save your current career"}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slots.map(s => {
              const isCurrent = s.id === currentSeasonId;
              return (
                <div key={s.id} className={`p-4 min-w-0 ${t.card}`} style={isCurrent ? { boxShadow: `0 0 0 1.5px ${t.accent}` } : undefined}>
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={getClubLogo(s.clubName)} alt="" className="w-10 h-10 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                    <div className="min-w-0 flex-1">
                      <div className="font-black truncate">{s.clubName || s.name}</div>
                      <div className={`text-[11px] truncate ${t.muted}`}>{s.leagueName} · {seasonLabel(s.seasonNum)} · {ru ? "тур" : "MD"} {s.matchday}</div>
                    </div>
                    {isCurrent && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0">{ru ? "открыта" : "active"}</span>}
                  </div>
                  <div className={`text-[10px] mt-2 ${t.muted}`}>{ru ? "Сохранено" : "Saved"}: {new Date(s.savedAt).toLocaleString(ru ? "ru-RU" : "en-GB")}</div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => load(s)} className={`flex-1 py-2 text-xs font-black uppercase ${t.btn}`}>{ru ? "Загрузить" : "Load"}</button>
                    <button onClick={() => remove(s)} className={`px-3 py-2 text-xs font-black ${t.btnGhost}`}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
