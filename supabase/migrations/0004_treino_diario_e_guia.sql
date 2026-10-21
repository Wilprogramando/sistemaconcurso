-- =====================================================================
-- 0004 — Treino diário de 20 questões e guia das matérias
--
--   * daily_sets: o conjunto de 20 questões sorteado para cada dia, para
--     que o treino seja o mesmo ao longo do dia e fique registrado
--   * guia das matérias: o que estudar, um exemplo concreto e a pergunta
--     que a disciplina responde (a tabela comparativa das matérias de Direito)
-- Rode no SQL Editor depois da 0003.
-- =====================================================================

-- ---------- treino do dia ----------
create table if not exists daily_sets (
  user_id      uuid not null references auth.users(id) on delete cascade,
  day          date not null,
  question_ids jsonb not null,
  goal         int  not null default 20,
  answered     int  not null default 0,
  correct      int  not null default 0,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists daily_sets_user_idx on daily_sets (user_id, day desc);

alter table daily_sets enable row level security;
drop policy if exists daily_sets_owner on daily_sets;
create policy daily_sets_owner on daily_sets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- guia das matérias ----------
-- Complementa os resumos da 0003 com o roteiro prático de estudo.
alter table disciplines add column if not exists what_to_study   jsonb; -- lista do que cai, em linguagem simples
alter table disciplines add column if not exists example         text;  -- um exemplo concreto do dia a dia
alter table disciplines add column if not exists answers_question text; -- a pergunta que a matéria responde
alter table disciplines add column if not exists study_tip       text;  -- dica de como estudar esta matéria
