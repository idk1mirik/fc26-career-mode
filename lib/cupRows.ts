// lib/cupRows.ts
// PostgREST при массовой вставке строк с РАЗНЫМ набором ключей подставляет
// NULL для пропущенных колонок (а не default из БД). Если в пачке есть
// строка-"bye" с is_bye: true и обычные пары без этого поля, обычные
// получали is_bye = NULL и падали на NOT NULL ("null value in column
// is_bye ... violates not-null constraint") — так ломался плей-офф ЛЧ.
// Эта функция явно проставляет значения по умолчанию во всех строках.
export function withCupDefaults<T extends Record<string, any>>(rows: T[]): (T & { is_bye: boolean; played: boolean })[] {
  return rows.map(r => ({ ...r, is_bye: r.is_bye ?? false, played: r.played ?? false }));
}
export function withCupDefaultsOne<T extends Record<string, any>>(row: T) {
  return withCupDefaults([row])[0];
}
