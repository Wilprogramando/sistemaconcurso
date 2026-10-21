-- =====================================================================
-- 0002 — Questoes de multipla escolha, proveniencia e textos-base
--
-- A prova da PMSC e de 5 alternativas (A a E). O banco inicial so tinha
-- Certo/Errado, vindo da apostila. Esta migracao acrescenta:
--   * kind: 'ce' (certo/errado), 'mc' (multipla escolha), 'open' (discursiva)
--   * options: as alternativas, em JSON
--   * proveniencia: de onde a questao veio (apostila, prova oficial, inedita)
--   * textos-base compartilhados (interpretacao de texto, Portugues)
--   * ext_id: chave estavel para o seed ser idempotente de verdade
-- Rode no SQL Editor depois da 0001.
-- =====================================================================

-- ---------- textos-base ----------
create table if not exists passages (
  id         text primary key,          -- ex. 'prova2023:1A5-I'
  label      text not null,             -- ex. 'Texto 1A5-I'
  body       text not null,
  source     text,
  created_at timestamptz not null default now()
);

alter table passages enable row level security;
drop policy if exists passages_read on passages;
create policy passages_read on passages for select to authenticated using (true);

-- ---------- novas colunas em questions ----------
alter table questions add column if not exists ext_id       text;
alter table questions add column if not exists kind         text not null default 'ce';
alter table questions add column if not exists options      jsonb;
alter table questions add column if not exists origin       text not null default 'apostila';
alter table questions add column if not exists origin_label text;
alter table questions add column if not exists year         int;
alter table questions add column if not exists banca        text;
alter table questions add column if not exists source_url   text;
alter table questions add column if not exists passage_id   text references passages(id) on delete set null;

-- kind herda o type antigo (que ja era 'ce'/'open')
update questions set kind = type where kind is distinct from type and type in ('ce', 'open');

-- ext_id para as linhas que ja existem
update questions q
   set ext_id = case
         when q.source = 'simulado' then 'apostila:simulado:' || q.number
         else 'apostila:' || coalesce((select d.slug from disciplines d where d.id = q.discipline_id), 'geral')
              || ':' || q.number
       end
 where q.ext_id is null;

update questions set origin = 'apostila',
                     origin_label = coalesce(origin_label, 'Apostila PM SC 2026')
 where origin_label is null;

alter table questions alter column ext_id set not null;
create unique index if not exists questions_ext_id_idx on questions (ext_id);

-- a resposta agora pode ser A..E, alem de C/E
alter table questions drop constraint if exists questions_answer_check;
alter table questions add  constraint questions_answer_check
  check (answer is null or answer in ('A','B','C','D','E'));

alter table questions drop constraint if exists questions_kind_check;
alter table questions add  constraint questions_kind_check
  check (kind in ('ce','mc','open'));

alter table questions drop constraint if exists questions_origin_check;
alter table questions add  constraint questions_origin_check
  check (origin in ('apostila','prova','inedita'));

-- 'source' antigo passa a aceitar os novos conjuntos de treino
alter table questions drop constraint if exists questions_source_check;
alter table questions add  constraint questions_source_check
  check (source in ('apostila','simulado','prova','inedita'));

create index if not exists questions_origin_idx on questions (origin, year);
create index if not exists questions_kind_idx on questions (kind);

-- ---------- teoria estruturada ----------
-- O corpo do topico deixa de ser so texto monoespacado: o parser agora entrega
-- blocos (heading, paragraph, list, table, callout) para o app renderizar com
-- tipografia de verdade, que e o que torna o material legivel no celular.
alter table topics add column if not exists blocks jsonb;
alter table topics add column if not exists reading_minutes int;

-- ---------- marcar questao para revisar depois ----------
create table if not exists bookmarks (
  user_id     uuid   not null references auth.users(id) on delete cascade,
  question_id bigint not null references questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table bookmarks enable row level security;
drop policy if exists bookmarks_owner on bookmarks;
create policy bookmarks_owner on bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- tempo de estudo por dia (para a sequencia e o painel) ----------
create or replace view v_daily_activity
with (security_invoker = true) as
select
  a.user_id,
  (a.answered_at at time zone 'America/Sao_Paulo')::date as dia,
  count(*)                              as respondidas,
  count(*) filter (where a.correct)     as acertos
from attempts a
group by a.user_id, (a.answered_at at time zone 'America/Sao_Paulo')::date;
