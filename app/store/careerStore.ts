"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CareerState {
  selectedClub:    any;
  selectedLeague:  any;
  seasonId:        string | null;
  matchday:        number;
  setSelectedClub:   (club: any)     => void;
  setSelectedLeague: (league: any)   => void;
  setSeasonId:       (id: string)    => void;
  setMatchday:       (day: number)   => void;
  resetCareer:       ()              => void;
}

export const useCareerStore = create<CareerState>()(
  persist(
    (set) => ({
      selectedClub:   null,
      selectedLeague: null,
      seasonId:       null,
      matchday:       1,
      setSelectedClub:   (club)    => set({ selectedClub: club }),
      setSelectedLeague: (league)  => set({ selectedLeague: league }),
      setSeasonId:       (id)      => set({ seasonId: id }),
      setMatchday:       (day)     => set({ matchday: day }),
      resetCareer: () => set({ selectedClub: null, selectedLeague: null, seasonId: null, matchday: 1 }),
    }),
    { name: "career-store", skipHydration: true }
  )
);
