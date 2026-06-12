// app/store/careerStore.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CareerState {
  selectedClub: any;
  setSelectedClub: (club: any) => void;
  selectedLeague: any;
  setSelectedLeague: (league: any) => void;
}

export const useCareerStore = create<CareerState>()(
  persist(
    (set) => ({
      selectedClub: null,
      setSelectedClub: (club) => set({ selectedClub: club }),
      selectedLeague: null,
      setSelectedLeague: (league) => set({ selectedLeague: league }),
    }),
    {
      name: "career-store",
      skipHydration: true,
    }
  )
);