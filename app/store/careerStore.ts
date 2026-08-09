"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CareerState {
  selectedClub:    any;
  selectedLeague:  any;
  seasonId:        string | null;
  matchday:        number;
  lineup:          Record<string, any>;
  lineupsByFormation: Record<string, Record<string, any>>;
  customFormations: Record<string, { slots: {slot:string,x:number,y:number}[]; positions: Record<string,string>; lineup: Record<string, any> }>;
  formation:       string;
  tactic:          string;
  customTactic:    any;
  locale:          "en" | "ru";
  lineupConfirmed: boolean;
  tacticConfirmed: boolean;
  favoritePlayerIds: string[];
  favoritePlayersData: Record<string, any>;
  setSelectedClub:   (club: any)              => void;
  setSelectedLeague: (league: any)            => void;
  setSeasonId:       (id: string)             => void;
  setMatchday:       (day: number)            => void;
  setLineup:         (lineup: Record<string, any>) => void;
  setLineupForFormation: (formation: string, lineup: Record<string, any>) => void;
  saveCustomFormation: (name: string, slots: any[], positions: Record<string,string>, lineup: Record<string, any>) => void;
  deleteCustomFormation: (name: string) => void;
  setFormation:      (f: string)              => void;
  setTactic:         (t: string)              => void;
  setCustomTactic:   (c: any)                 => void;
  setLocale:         (l: "en" | "ru")          => void;
  confirmLineup:     ()                        => void;
  confirmTactic:     ()                        => void;
  toggleFavorite:    (player: { id: string; [k: string]: any }) => void;
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
      lineupsByFormation: {},
      customFormations: {},
      formation:      "4-3-3",
      tactic:         "Balanced",
      customTactic:   { defensiveLine: 5, pressing: 5, width: 5, tempo: 5, passingRisk: 5, buildUpSpeed: 5, attackingWidth: 5 },
      locale:         "en",
      lineupConfirmed: false,
      tacticConfirmed: false,
      favoritePlayerIds: [],
      favoritePlayersData: {},
      setSelectedClub:   (club)    => set({ selectedClub: club }),
      setSelectedLeague: (league)  => set({ selectedLeague: league }),
      setSeasonId:       (id)      => set({ seasonId: id }),
      setMatchday:       (day)     => set({ matchday: day }),
      setLineup:         (lineup)  => set({ lineup, lineupConfirmed: false }),
      setLineupForFormation: (formation, lineup) => set(state => ({
        lineupsByFormation: { ...state.lineupsByFormation, [formation]: lineup },
        lineup, lineupConfirmed: false,
      })),
      saveCustomFormation: (name, slots, positions, lineup) => set(state => ({
        customFormations: { ...state.customFormations, [name]: { slots, positions, lineup } },
      })),
      deleteCustomFormation: (name) => set(state => {
        const next = { ...state.customFormations };
        delete next[name];
        return { customFormations: next };
      }),
      setFormation:      (f)       => set({ formation: f, lineupConfirmed: false }),
      setTactic:         (t)       => set({ tactic: t, tacticConfirmed: false }),
      setCustomTactic:   (c)       => set({ customTactic: c, tacticConfirmed: false }),
      setLocale:         (l)       => set({ locale: l }),
      confirmLineup:     ()        => set({ lineupConfirmed: true }),
      confirmTactic:     ()        => set({ tacticConfirmed: true }),
      toggleFavorite: (player) => set(state => {
        const isFav = state.favoritePlayerIds.includes(player.id);
        if (isFav) {
          const next = { ...state.favoritePlayersData };
          delete next[player.id];
          return { favoritePlayerIds: state.favoritePlayerIds.filter(id => id !== player.id), favoritePlayersData: next };
        }
        return {
          favoritePlayerIds: [...state.favoritePlayerIds, player.id],
          favoritePlayersData: { ...state.favoritePlayersData, [player.id]: player },
        };
      }),
      resetCareer: () => set({
        selectedClub: null, selectedLeague: null, seasonId: null, matchday: 1,
        lineup: {}, formation: "4-3-3", tactic: "Balanced",
        customTactic: { defensiveLine: 5, pressing: 5, width: 5, tempo: 5, passingRisk: 5, buildUpSpeed: 5, attackingWidth: 5 },
        lineupsByFormation: {}, customFormations: {},
        lineupConfirmed: false, tacticConfirmed: false, favoritePlayerIds: [], favoritePlayersData: {},
      }),
    }),
    { name: "career-store", skipHydration: true }
  )
);
