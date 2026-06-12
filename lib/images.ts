import { STORAGE } from "./storage";
import { normalizeName } from "./normalize";

export function getClubLogo(name: string) {
  return `${STORAGE.clubs}/${normalizeName(name)}.png`;
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