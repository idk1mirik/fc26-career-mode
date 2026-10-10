"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { pageTheme } from "@/lib/pageTheme";
import { getClubLogo } from "@/data/clublogos";
import { seasonLabel } from "@/lib/seasonLabel";
import { getFx } from "@/lib/i18nFx";
import { icons } from "@/lib/themeFlavor";
import { PageHeader, Stars } from "@/components/ThemeBits";
import { readSlots, snapshotFromStore, upsertSlot, deleteSlot, exportSlotsJson, importSlotsJson, type CareerSlot } from "@/lib/careerSlots";

// Несколько карьер: сохранить текущую в слот, загрузить другую, перенести файлом.
export default function CareersPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const themeRaw = useThemeStore(s => s.theme);
  const locale = (useCareerStore(s => s.locale) || "en") as "en" | "ru";
  const currentSeasonId = useCareerStore(s => s.seasonId);
  const [slots, setSlots] = useState<CareerSlot[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { useCareerStore.persist.rehydrate(); useThemeStore.persist.rehydrate(); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) setSlots(readSlots()); }, [hydrated]);
  if (!hydrated) return null;
  const theme = (themeRaw ?? "classic") as string;
  const t = pageTheme(theme);
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const saveCurrent = () => {
    const st = useCareerStore.getState() as any;
    if (!st.seasonId) { flash(fx.carNoActive); return; }
    upsertSlot(snapshotFromStore(st));
    setSlots(readSlots());
    flash(fx.carSavedMsg);
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
      else if (r.status === 404) { flash(fx.carMissing); return; }
    } catch { /* офлайн — берём сохранённые значения */ }
    router.push("/dashboard");
  };

  const remove = (slot: CareerSlot) => {
    if (!window.confirm(fx.carDelete(slot.name))) return;
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
    try { const n = importSlotsJson(await f.text()); setSlots(readSlots()); flash(fx.carImported(n)); }
    catch { flash(fx.carBad); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${t.text}`} style={t.font}>
        <PageHeader theme={theme} eyebrow={fx.carEyebrow} title={fx.carTitle} />

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={saveCurrent} className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide ${t.btn}`}>{ic.save} {fx.carSave}</button>
          <button onClick={doExport} className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide ${t.btnGhost}`}>{ic.export} {fx.carExport}</button>
          <button onClick={() => fileRef.current?.click()} className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide ${t.btnGhost}`}>{ic.import} {fx.carImport}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => doImport(e.target.files?.[0])} />
        </div>
        {/* Восстановление игроков, ушедших свободными агентами из-за годовых контрактов */}
        {currentSeasonId && (
          <div className={`mb-6 p-4 flex items-center gap-3 flex-wrap ${t.card} ${t.shadow}`}>
            <div className="min-w-0 flex-1 basis-60">
              <div className="text-sm font-black">{fx.carRepair}</div>
              <div className={`text-[11px] mt-0.5 ${t.muted}`}>{fx.carRepairHint}</div>
            </div>
            <button disabled={repairing} onClick={async () => {
              if (!window.confirm(fx.carRepairConfirm)) return;
              setRepairing(true);
              try {
                const r = await fetch("/api/season/repair-contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId: currentSeasonId }) });
                const d = await r.json();
                flash(r.ok ? (d.restored > 0 ? fx.carRepairDone(d.restored) : fx.carRepairNone) : (d.error ?? fx.carBad));
              } catch { flash(fx.carBad); }
              setRepairing(false);
            }} className={`px-4 py-2.5 text-xs font-black uppercase tracking-wide disabled:opacity-50 ${t.btnGhost}`}>
              {repairing ? "…" : fx.carRepair}
            </button>
          </div>
        )}
        {msg && <div className={`mb-4 px-4 py-2.5 text-sm font-bold ${t.cardAlt}`} style={{ color: t.accent }}>{msg}</div>}

        {slots.length === 0 ? (
          <div className={`py-14 text-center text-sm ${t.card} ${t.muted}`}>{fx.carNone}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slots.map(s => {
              const isCurrent = s.id === currentSeasonId;
              return (
                <div key={s.id} className={`p-4 min-w-0 ${t.card} ${t.shadow}`} style={isCurrent ? { boxShadow: `0 0 0 1.5px ${t.accent}` } : undefined}>
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={getClubLogo(s.clubName)} alt="" className="w-10 h-10 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                    <div className="min-w-0 flex-1">
                      <div className="font-black truncate">{s.clubName || s.name}</div>
                      <div className={`text-[11px] truncate ${t.muted}`}>{s.leagueName} · {seasonLabel(s.seasonNum)} · {fx.carMD} {s.matchday}</div>
                    </div>
                    {isCurrent && <span className={`text-[9px] font-black uppercase px-2 py-0.5 shrink-0 ${isM ? "border" : "rounded-full"}`} style={{ color: t.good, background: `${t.good}1f`, borderColor: `${t.good}66` }}>{fx.carActive}</span>}
                  </div>
                  <div className="mt-2"><Stars value={Math.min(5, s.seasonNum)} theme={theme} size={10} /></div>
                  <div className={`text-[10px] mt-1 ${t.muted}`}>{fx.carSaved}: {new Date(s.savedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")}</div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => load(s)} className={`flex-1 py-2 text-xs font-black uppercase ${t.btn}`}>{fx.carLoad}</button>
                    <button onClick={() => remove(s)} className={`px-3 py-2 text-xs font-black ${t.btnGhost}`} style={isM ? { color: t.bad } : undefined}>{ic.trash}</button>
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
