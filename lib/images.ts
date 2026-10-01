import { STORAGE } from "./storage";
import { normalizeName } from "./normalize";
import { resolvedClubLogoFilename } from "./clubLogoResolver";
import { resolvedPhotoFilename } from "./photoResolver";

export function getClubLogo(name: string) {
  // См. lib/clubLogoResolver.ts — если для клуба через prewarmClubLogos()
  // найден более свежий пронумерованный вариант герба, отдаём его вместо
  // базового имени.
  const latest = resolvedClubLogoFilename(name);
  return `${STORAGE.clubs}/${latest ?? `${normalizeName(name)}.png`}`;
}

export function getPlayerPhoto(name: string) {
  // См. lib/photoResolver.ts — тот же приём, что и для гербов: если найден
  // более свежий пронумерованный вариант фото лица, отдаём его.
  const latest = resolvedPhotoFilename("players", name);
  return `${STORAGE.players}/${latest ?? `${normalizeName(name)}.png`}`;
}

export function getPlayerFullPhoto(name: string) {
  const latest = resolvedPhotoFilename("players_full", name);
  return `${STORAGE.playersFull}/${latest ?? `${normalizeName(name)}.png`}`;
}

export function getFlag(country: string) {
  return `${STORAGE.flags}/${normalizeName(country)}.png`;
}

export function getLeagueLogo(name: string) {
  return `${STORAGE.leagues}/${normalizeName(name)}.png`;
}