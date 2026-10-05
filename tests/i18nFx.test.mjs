import test from "node:test";
import assert from "node:assert/strict";
import { getFx } from "@/lib/i18nFx";
import { getContractsCopy } from "@/lib/i18nContracts";
import { icons, medals } from "@/lib/themeFlavor";

const THEMES = ["classic", "aurora", "maleficent"];
const LOCALES = ["en", "ru"];

test("тексты: во всех темах и языках заполнены все ключи", () => {
  const base = Object.keys(getFx("en", "classic"));
  for (const l of LOCALES) for (const t of THEMES) {
    const fx = getFx(l, t);
    assert.deepEqual(Object.keys(fx).sort(), base.sort(), `${l}/${t}: набор ключей отличается`);
    for (const k of base) {
      const v = fx[k];
      assert.ok(typeof v === "function" || (typeof v === "string" && v.length > 0), `${l}/${t}: пустой ключ ${k}`);
    }
  }
});

test("тексты-функции возвращают непустые строки", () => {
  for (const l of LOCALES) for (const t of THEMES) {
    const fx = getFx(l, t);
    for (const s of [fx.posOf(2, 20), fx.drawNext(3), fx.undoSelling("Name", 4), fx.seasonDone("2026/27"), fx.finalPos(1, 20), fx.carImported(2), fx.carDelete("X"), fx.lbMinMatches(5), fx.cmpPlayer(1)]) {
      assert.ok(typeof s === "string" && s.length > 0);
    }
  }
});

test("темы звучат по-разному (aurora и maleficent не копируют classic)", () => {
  for (const l of LOCALES) {
    assert.notEqual(getFx(l, "aurora").navHistory, getFx(l, "classic").navHistory);
    assert.notEqual(getFx(l, "maleficent").navHistory, getFx(l, "classic").navHistory);
    assert.notEqual(getFx(l, "maleficent").boardTitle, getFx(l, "aurora").boardTitle);
  }
});

test("тексты контрактов: у тем есть свои формулировки и ничего не потеряно", () => {
  for (const l of LOCALES) {
    const c = getContractsCopy(l, "classic");
    for (const t of ["aurora", "maleficent"]) {
      const th = getContractsCopy(l, t);
      assert.deepEqual(Object.keys(th).sort(), Object.keys(c).sort());
      assert.notEqual(th.offerButton, c.offerButton);
    }
  }
});

test("иконки: у каждой темы полный набор, у maleficent нет цветных эмодзи-медалей", () => {
  const keys = Object.keys(icons("classic"));
  for (const t of THEMES) assert.deepEqual(Object.keys(icons(t)).sort(), keys.sort());
  assert.deepEqual(medals("maleficent"), ["I", "II", "III"]);
  assert.equal(medals("classic").length, 3);
});
