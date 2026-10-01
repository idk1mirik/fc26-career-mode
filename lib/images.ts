import { STORAGE } from "./storage";
import { normalizeName } from "./normalize";
import { resolvedClubLogoFilename } from "./clubLogoResolver";

export function getClubLogo(name: string) {
  // См. lib/clubLogoResolver.ts — если для клуба через prewarmClubLogos()
  // найден более свежий пронумерованный вариант герба, отдаём его вместо
  // базового имени.
  const latest = resolvedClubLogoFilename(name);
  return `${STORAGE.clubs}/${latest ?? `${normalizeName(name)}.png`}`;
}

export function getPlayerPhoto(name: string) {
  return `${STORAGE.players}/${normalizeName(name)}.png`;
}

export function getPlayerFullPhoto(name: string) {
  return `${STORAGE.playersFull}/${normalizeName(name)}.png`;
}

export function getFlag(country: string) {
  return `${STORAGE.flags}/${normalizeName(country)}.png`;
}

export function getLeagueLogo(name: string) {
  return `${STORAGE.leagues}/${normalizeName(name)}.png`;
}