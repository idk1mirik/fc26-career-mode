"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CareerState {
  selectedClub:    any;
  selectedLeague:  any;
  seasonId:        string | null;
  matchday:        number;
  lineup:          Record<string, any>;
  formation:       string;
  setSelectedClub:   (club: any)              => void;
  setSelectedLeague: (league: any)            => void;
  setSeasonId:       (id: string)             => void;
  setMatchday:       (day: number)            => void;
  setLineup:         (lineup: Record<string, any>) => void;
  setFormation:      (f: string)              => void;
  tactic:        string;
  setTactic:     (t: string)              => void;
  customTactic:  any;
  setCustomTactic: (c: any)              => void;
  resetCareer:       ()                       => void;
}

export const useCareerStore = create<CareerState>()(
  persist(
    (set) => ({
      selectedClub:   null,
      selectedLeague: null,
      seasonId:       null,
      matchday:       1,
      lineup:         {},
      formation:      "4-3-3",
      tactic:        "Balanced",
      customTactic:  { defensiveLine: 5, pressing: 5, width: 5, tempo: 5, passingRisk: 5, buildUpSpeed: 5, attackingWidth: 5 },
      setSelectedClub:   (club)    => set({ selectedClub: club }),
      setSelectedLeague: (league)  => set({ selectedLeague: league }),
      setSeasonId:       (id)      => set({ seasonId: id }),
      setMatchday:       (day)     => set({ matchday: day }),
      setLineup:         (lineup)  => set({ lineup }),
      setFormation:      (f)       => set({ formation: f }),
      setTactic:         (t)       => set({ tactic: t }),
      setCustomTactic:   (c)       => set({ customTactic: c }),
      resetCareer: () => set({ selectedClub: null, selectedLeague: null, seasonId: null, matchday: 1, lineup: {}, formation: "4-3-3" }),
    }),
    { name: "career-store", skipHydration: true }
  )
);
