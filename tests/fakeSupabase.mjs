// tests/fakeSupabase.mjs — база Supabase в памяти для сквозных тестов маршрутов.
// Повторяет то, что важно для багов: PostgREST при пакетной вставке строк с
// РАЗНЫМ набором ключей ставит NULL в пропущенные колонки (default из БД
// действует только для колонок, которых нет ни в одной строке пачки), а NOT NULL
// колонки (is_bye, played …) такие строки отвергают — именно так падал плей-офф ЛЧ.
import { randomUUID } from "node:crypto";

const DEFAULTS = {
  seasons: { status: "active", matchday: 1, season_num: 1 },
  fixtures: { played: false },
  standings: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
  cup_fixtures: { played: false, is_bye: false },
  competitions: { status: "active", current_round: 1 },
  contracts: {}, transfers: {}, notifications: { read: false },
};
const NOT_NULL = {
  cup_fixtures: ["is_bye", "played", "competition_id", "round"],
  fixtures: ["played", "season_id", "matchday"],
  standings: ["season_id", "club_id", "played", "won", "drawn", "lost", "gf", "ga", "points"],
  competitions: ["season_id", "name", "type"],
};

export const db = new Map();           // table -> rows[]
export function resetDb() { db.clear(); }
const tbl = (name) => { if (!db.has(name)) db.set(name, []); return db.get(name); };
const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
const err = (message, code = "23502") => ({ message, code });

function normalizeInsert(name, input) {
  const rows = Array.isArray(input) ? input : [input];
  if (rows.length === 0) return { rows: [] };
  const keys = new Set(); rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  const defaults = DEFAULTS[name] ?? {};
  const out = [];
  for (const r of rows) {
    const row = {};
    for (const k of keys) row[k] = r[k] === undefined ? null : r[k];                 // PostgREST: пропущено в части строк → NULL
    for (const [k, v] of Object.entries(defaults)) if (!keys.has(k)) row[k] = v;      // default — только для колонок вне пачки
    if (row.id == null) row.id = randomUUID();
    if (row.created_at == null) row.created_at = new Date(Date.now() + out.length).toISOString();
    for (const c of NOT_NULL[name] ?? []) {
      if (row[c] === null || row[c] === undefined) return { error: err(`null value in column "${c}" of relation "${name}" violates not-null constraint`) };
    }
    out.push(row);
  }
  return { rows: out };
}

const cmp = (a, b) => (a === b ? 0 : a == null ? -1 : b == null ? 1 : a < b ? -1 : 1);
const eqLoose = (a, b) => a === b || (a != null && b != null && String(a) === String(b));

class Query {
  constructor(table) {
    this.table = table; this.op = "select"; this.payload = null; this.preds = []; this.orders = [];
    this.limitN = null; this.rng = null; this.mode = null; this.returning = false; this.countOpt = null; this.head = false; this.upsertOpts = null;
  }
  select(_cols, opts) { if (this.op === "select") { this.countOpt = opts?.count ?? null; this.head = !!opts?.head; } else this.returning = true; return this; }
  insert(p) { this.op = "insert"; this.payload = p; return this; }
  update(p) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  upsert(p, opts) { this.op = "upsert"; this.payload = p; this.upsertOpts = opts ?? {}; return this; }
  eq(c, v) { this.preds.push(r => eqLoose(r[c], v)); return this; }
  neq(c, v) { this.preds.push(r => !eqLoose(r[c], v)); return this; }
  gt(c, v) { this.preds.push(r => r[c] != null && r[c] > v); return this; }
  gte(c, v) { this.preds.push(r => r[c] != null && r[c] >= v); return this; }
  lt(c, v) { this.preds.push(r => r[c] != null && r[c] < v); return this; }
  lte(c, v) { this.preds.push(r => r[c] != null && r[c] <= v); return this; }
  in(c, arr) { const set = new Set((arr ?? []).map(String)); this.preds.push(r => r[c] != null && set.has(String(r[c]))); return this; }
  is(c, v) { this.preds.push(r => (v === null ? r[c] == null : r[c] === v)); return this; }
  not(c, op, v) { if (op === "is") this.preds.push(r => (v === null ? r[c] != null : r[c] !== v)); else if (op === "eq") this.preds.push(r => !eqLoose(r[c], v)); return this; }
  ilike(c, pat) { const re = new RegExp("^" + String(pat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i"); this.preds.push(r => r[c] != null && re.test(String(r[c]))); return this; }
  match(o) { for (const [k, v] of Object.entries(o)) this.eq(k, v); return this; }
  or(str) { const parts = String(str).split(",").map(p => p.split(".")); this.preds.push(r => parts.some(([c, op, ...v]) => op === "eq" && eqLoose(r[c], v.join(".")))); return this; }
  order(c, o = {}) { this.orders.push([c, o.ascending === false ? -1 : 1]); return this; }
  limit(n) { this.limitN = n; return this; }
  range(a, b) { this.rng = [a, b]; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }

  run() {
    const rows = tbl(this.table);
    const match = () => rows.filter(r => this.preds.every(p => p(r)));
    let data = null, error = null, count = null;

    if (this.op === "select") {
      let m = match();
      for (const [c, d] of [...this.orders].reverse()) m = [...m].sort((a, b) => d * cmp(a[c], b[c]));
      count = this.countOpt ? m.length : null;
      if (this.rng) m = m.slice(this.rng[0], this.rng[1] + 1);
      if (this.limitN != null) m = m.slice(0, this.limitN);
      data = this.head ? null : clone(m);
    } else if (this.op === "insert" || (this.op === "upsert")) {
      const n = normalizeInsert(this.table, this.payload);
      if (n.error) return { data: null, error: n.error, count: null };
      const out = [];
      for (const row of n.rows) {
        if (this.op === "upsert") {
          const cols = (this.upsertOpts?.onConflict ?? "id").split(",").map(s => s.trim());
          const ex = rows.find(r => cols.every(c => eqLoose(r[c], row[c])));
          if (ex) { Object.assign(ex, Object.fromEntries(Object.entries(row).filter(([k]) => k !== "id" || row.id))); out.push(ex); continue; }
        }
        rows.push(row); out.push(row);
      }
      data = this.returning ? clone(out) : null;
    } else if (this.op === "update") {
      const m = match(); m.forEach(r => Object.assign(r, clone(this.payload)));
      data = this.returning ? clone(m) : null;
    } else if (this.op === "delete") {
      const m = new Set(match()); const keep = rows.filter(r => !m.has(r)); rows.length = 0; rows.push(...keep);
      data = this.returning ? clone([...m]) : null;
    }

    if (this.mode && Array.isArray(data)) {
      if (this.mode === "single") { if (data.length !== 1) return { data: null, error: err(`JSON object requested, multiple (or no) rows returned (${data.length})`, "PGRST116"), count }; data = data[0]; }
      else { if (data.length > 1) return { data: null, error: err("multiple rows returned", "PGRST116"), count }; data = data[0] ?? null; }
    }
    return { data, error, count };
  }
}
export const supabase = { from: (t) => new Query(t), rpc: async () => ({ data: null, error: err("rpc not supported", "42883") }) };
export default supabase;
