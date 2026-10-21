-- =====================================================================
-- 0003 — Treino de redação e resumos didáticos
--
--   * essays: cada redação escrita no sistema, com a nota e o detalhamento
--     por critério, para acompanhar a evolução
--   * resumos por disciplina (o que é, para que serve, como cai, armadilhas)
--   * resumo por tópico (o que significa e para que serve)
-- Rode no SQL Editor depois da 0002.
-- =====================================================================

-- ---------- redações ----------
create table if not exists essays (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  theme_id    text not null,
  theme_title text not null,
  body        text not null,
  words       int  not null default 0,
  score       numeric(4,1) not null default 0,
  max_score   numeric(4,1) not null default 20,
  breakdown   jsonb,
  minutes     int,
  created_at  timestamptz not null default now()
);
create index if not exists essays_user_idx on essays (user_id, created_at desc);

alter table essays enable row level security;
drop policy if exists essays_owner on essays;
create policy essays_owner on essays for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- resumos didáticos ----------
-- Explicam o que a matéria/tópico é e para que serve, antes da teoria crua.
alter table disciplines add column if not exists summary      text;  -- o que é, em 2 ou 3 frases
alter table disciplines add column if not exists what_for     text;  -- para que serve no trabalho do PM
alter table disciplines add column if not exists how_it_falls text;  -- como a banca costuma cobrar
alter table disciplines add column if not exists traps        jsonb; -- armadilhas mais frequentes
alter table disciplines add column if not exists key_numbers  jsonb; -- números que precisam estar na ponta da língua

alter table topics add column if not exists summary  text;  -- o que é este tópico
alter table topics add column if not exists what_for text;  -- por que ele importa na prova

-- ---------- limpeza do índice legado ----------
-- A identidade de uma questão passou a ser o ext_id (migração 0002). O índice
-- antigo (source + disciplina + número) impedia carregar duas provas do mesmo
-- ano, porque ambas têm uma "questão 1" de Direito Constitucional.
drop index if exists questions_unique_idx;
