-- 0001_contracts_negotiations.sql
-- Куда ставить: выполнить в Supabase → SQL Editor (или через `supabase db push`,
-- если у тебя настроен Supabase CLI и папка supabase/migrations уже используется).
--
-- Схема согласована с существующими таблицами проекта:
--   - season_id  → uuid, ссылается на seasons(id), как в standings/fixtures/player_status
--   - club_id    → text, как везде в проекте (club_id хранится как строковый id клуба)
--   - player_id  → text, как в player_status.player_id (там же есть fallback на player_name,
--                  на случай если у части игроков из CSV нет стабильного id)

create table if not exists contracts (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid not null references seasons(id) on delete cascade,
  career_id        uuid not null,                    -- совпадает с careerId, который уже используется в progression.ts
  club_id          text not null,
  player_id        text not null,
  player_name      text not null,                    -- дублируем имя — на случай если player_id нестабилен (как в player_status)
  wage_weekly      integer not null default 0,
  years_left       integer not null default 1,        -- 0 = контракт истёк, игрок становится свободным агентом
  release_clause   integer,                            -- null = отступных нет
  signing_bonus    integer not null default 0,
  squad_role       text not null default 'rotation'    -- 'star' | 'important' | 'rotation' | 'prospect' | 'backup'
                     check (squad_role in ('star','important','rotation','prospect','backup')),
  happiness        integer not null default 70 check (happiness between 0 and 100),
  wants_renewal    boolean not null default false,
  transfer_listed  boolean not null default false,
  updated_at       timestamptz not null default now(),

  unique (season_id, club_id, player_id)
);

create index if not exists idx_contracts_season_club on contracts (season_id, club_id);
create index if not exists idx_contracts_career on contracts (career_id);

create table if not exists negotiations (
  id                uuid primary key default gen_random_uuid(),
  contract_id       uuid not null references contracts(id) on delete cascade,
  status            text not null default 'open' check (status in ('open','agreed','rejected','expired')),
  round             integer not null default 1,
  club_offer        jsonb not null,   -- { wage, years, bonus, role }
  player_demand     jsonb not null,   -- { wage, years, bonus, role }
  deadline_matchday integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_negotiations_contract on negotiations (contract_id);
create index if not exists idx_negotiations_open on negotiations (status) where status = 'open';

-- RLS: включаем и по умолчанию разрешаем всё для anon-ключа —
-- так же, как у остальных таблиц в этом проекте (там нет RLS-ограничений,
-- вся защита сейчас на уровне API-роутов). Если позже заведёшь auth —
-- сюда добавь policy по user_id/career_id.
alter table contracts enable row level security;
alter table negotiations enable row level security;

drop policy if exists "contracts_all" on contracts;
create policy "contracts_all" on contracts for all using (true) with check (true);

drop policy if exists "negotiations_all" on negotiations;
create policy "negotiations_all" on negotiations for all using (true) with check (true);
