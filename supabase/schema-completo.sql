-- =====================================================================
-- Schema completo — as migrações 0001 a 0010 emendadas, na ordem.
-- Gerado por scripts/juntar-migracoes.mjs; não edite à mão: mexa na
-- migração correspondente e gere de novo.
-- =====================================================================


-- ============================ 0001_init.sql ============================

-- =====================================================================
-- Sistema de Estudo PM SC 2026 - Soldado QPPM
-- Schema inicial (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

-- ---------- CONTEUDO (leitura para usuarios autenticados) ----------

create table if not exists disciplines (
  id             serial primary key,
  slug           text not null unique,
  chapter        int  not null,
  name           text not null,
  question_count int  not null default 0,   -- questoes na prova (Tabela 8.1 do edital)
  weight         numeric(4,1) not null default 0,
  priority       text not null default 'MEDIA'
    check (priority in ('MAXIMA','ALTA','MEDIA','BAIXA'))
);

create table if not exists topics (
  id            serial primary key,
  discipline_id int  not null references disciplines(id) on delete cascade,
  ref           text not null,              -- ex. "7.2"
  ord           int  not null default 0,
  slug          text not null,
  title         text not null,
  body          text not null default '',
  unique (discipline_id, ref)
);
create index if not exists topics_discipline_idx on topics (discipline_id, ord);

create table if not exists questions (
  id            bigserial primary key,
  source        text not null default 'apostila' check (source in ('apostila','simulado')),
  discipline_id int references disciplines(id) on delete cascade,
  topic_id      int references topics(id) on delete set null,
  number        int  not null,
  type          text not null default 'ce' check (type in ('ce','open')),
  statement     text not null,
  answer        char(1) check (answer in ('C','E')),
  explanation   text not null default ''
);
create unique index if not exists questions_unique_idx
  on questions (source, coalesce(discipline_id, 0), number);
create index if not exists questions_discipline_idx on questions (discipline_id);

-- ---------- DADOS DO USUARIO ----------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  exam_date   date,
  daily_goal  int not null default 20,      -- questoes por dia
  created_at  timestamptz not null default now()
);

create table if not exists exam_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  kind             text not null check (kind in ('treino','simulado','revisao')),
  discipline_id    int references disciplines(id) on delete set null,
  total            int not null default 0,
  correct          int not null default 0,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  duration_seconds int
);
create index if not exists exam_sessions_user_idx on exam_sessions (user_id, started_at desc);

create table if not exists attempts (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references questions(id) on delete cascade,
  session_id  uuid references exam_sessions(id) on delete set null,
  chosen      char(1),
  correct     boolean not null,
  answered_at timestamptz not null default now()
);
create index if not exists attempts_user_idx on attempts (user_id, answered_at desc);
create index if not exists attempts_question_idx on attempts (user_id, question_id);

-- Revisao espacada (SM-2 simplificado)
create table if not exists reviews (
  user_id       uuid not null references auth.users(id) on delete cascade,
  question_id   bigint not null references questions(id) on delete cascade,
  ease          numeric(4,2) not null default 2.50,
  interval_days int not null default 0,
  repetitions   int not null default 0,
  lapses        int not null default 0,
  due_on        date not null default current_date,
  last_result   boolean,
  updated_at    timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index if not exists reviews_due_idx on reviews (user_id, due_on);

-- Caderno de erros
create table if not exists error_notes (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id bigint references questions(id) on delete cascade,
  topic_id    int references topics(id) on delete set null,
  note        text not null default '',
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists error_notes_user_idx on error_notes (user_id, created_at desc);

-- Progresso de leitura da teoria
create table if not exists topic_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  topic_id   int  not null references topics(id) on delete cascade,
  status     text not null default 'lendo' check (status in ('lendo','lido','revisar')),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

-- Check-off do plano de estudo ('30' = reta final, '12' = 12 semanas)
create table if not exists study_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan    text not null check (plan in ('30','12')),
  day     int  not null,
  done    boolean not null default true,
  done_at timestamptz not null default now(),
  primary key (user_id, plan, day)
);

-- ---------- RLS ----------

alter table disciplines    enable row level security;
alter table topics         enable row level security;
alter table questions      enable row level security;
alter table profiles       enable row level security;
alter table exam_sessions  enable row level security;
alter table attempts       enable row level security;
alter table reviews        enable row level security;
alter table error_notes    enable row level security;
alter table topic_progress enable row level security;
alter table study_days     enable row level security;

drop policy if exists disciplines_read on disciplines;
create policy disciplines_read on disciplines for select to authenticated using (true);

drop policy if exists topics_read on topics;
create policy topics_read on topics for select to authenticated using (true);

drop policy if exists questions_read on questions;
create policy questions_read on questions for select to authenticated using (true);

drop policy if exists profiles_owner on profiles;
create policy profiles_owner on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists exam_sessions_owner on exam_sessions;
create policy exam_sessions_owner on exam_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists attempts_owner on attempts;
create policy attempts_owner on attempts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists reviews_owner on reviews;
create policy reviews_owner on reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists error_notes_owner on error_notes;
create policy error_notes_owner on error_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists topic_progress_owner on topic_progress;
create policy topic_progress_owner on topic_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists study_days_owner on study_days;
create policy study_days_owner on study_days for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- PROFILE AUTOMATICO NO CADASTRO ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- VIEW: desempenho por disciplina ----------

create or replace view v_discipline_stats
with (security_invoker = true) as
select
  d.id   as discipline_id,
  d.slug,
  d.name,
  d.question_count,
  d.weight,
  d.priority,
  a.user_id,
  count(a.id)                                  as answered,
  count(a.id) filter (where a.correct)         as correct,
  case when count(a.id) = 0 then null
       else round(100.0 * count(a.id) filter (where a.correct) / count(a.id), 1)
  end                                          as accuracy
from disciplines d
left join questions q on q.discipline_id = d.id
left join attempts  a on a.question_id = q.id
group by d.id, d.slug, d.name, d.question_count, d.weight, d.priority, a.user_id;

-- ============================ 0002_questoes_multipla_escolha.sql ============================

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

-- ============================ 0003_redacao_e_resumos.sql ============================

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

-- ============================ 0004_treino_diario_e_guia.sql ============================

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

-- ============================ 0005_anotacoes_e_aulas.sql ============================

-- =====================================================================
-- 0005 — Anotações do candidato
--
-- Caderno livre, separado do caderno de erros: aqui vai o que você quer
-- guardar com suas palavras — um macete, um número que não gruda, uma
-- dúvida para tirar depois. Pode ou não estar amarrado a uma matéria ou
-- a um tópico.
-- Rode no SQL Editor depois da 0004.
-- =====================================================================

create table if not exists notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null default '',
  body          text not null default '',
  discipline_id int references disciplines(id) on delete set null,
  topic_id      int references topics(id) on delete set null,
  tag           text not null default 'nota'
    check (tag in ('nota', 'macete', 'duvida', 'numero', 'lei')),
  pinned        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists notes_user_idx on notes (user_id, pinned desc, updated_at desc);
create index if not exists notes_topic_idx on notes (user_id, topic_id);
create index if not exists notes_discipline_idx on notes (user_id, discipline_id);

alter table notes enable row level security;
drop policy if exists notes_owner on notes;
create policy notes_owner on notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- mantém updated_at coerente sem depender do cliente
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at = now();
  return new;
end
$fn$;

drop trigger if exists notes_touch_updated_at on notes;
create trigger notes_touch_updated_at
  before update on notes
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Aula didática do tópico
--
-- O corpo do tópico é a transcrição da apostila: denso, em letra de lei.
-- A aula é a camada escrita para explicar — em uma frase, explicação em
-- linguagem direta, exemplo do serviço policial, pegadinhas da banca e um
-- resumo para a véspera. Fica ACIMA do texto da apostila na tela.
-- =====================================================================
alter table topics add column if not exists lesson jsonb;

-- ============================ 0006_imagens_nas_anotacoes.sql ============================

-- =====================================================================
-- 0006 — Fotos e prints nas anotações
--
-- Cria o bucket privado "anotacoes" no Storage e as políticas que deixam
-- cada usuário ver e gravar APENAS dentro da própria pasta. O caminho de
-- todo arquivo é <uid>/<id-da-imagem>.<ext>, e é o primeiro segmento que
-- a política confere.
-- Rode no SQL Editor depois da 0005.
-- =====================================================================

-- ---------- bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anotacoes',
  'anotacoes',
  false,                                   -- privado: acesso só por URL assinada
  8388608,                                 -- 8 MB por arquivo
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- ---------- políticas: cada um só enxerga a própria pasta ----------
drop policy if exists anotacoes_ler_proprias   on storage.objects;
drop policy if exists anotacoes_gravar_proprias on storage.objects;
drop policy if exists anotacoes_apagar_proprias on storage.objects;

create policy anotacoes_ler_proprias on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anotacoes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy anotacoes_gravar_proprias on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anotacoes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy anotacoes_apagar_proprias on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anotacoes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- imagens da anotação ----------
-- Guarda só o caminho no bucket; a URL é assinada na hora de exibir.
alter table notes add column if not exists images jsonb not null default '[]'::jsonb;

-- ============================ 0007_anotacoes_ricas.sql ============================

-- =====================================================================
-- 0007 — Anotações com texto rico, PDFs e ordem manual
--
-- Acrescenta à tabela notes:
--   body_html   texto formatado (negrito, cores, links, imagens no meio)
--   attachments PDFs anexados, como [{ path, name, size }]
--   position    ordem escolhida à mão dentro da matéria/tópico
-- E libera PDF no bucket "anotacoes" (criado na 0006).
-- Rode no SQL Editor depois da 0006.
-- =====================================================================

alter table notes add column if not exists body_html   text;
alter table notes add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table notes add column if not exists position    int   not null default 0;

-- a ordem manual entra antes da data; empate cai no updated_at
create index if not exists notes_ordem_idx
  on notes (user_id, pinned desc, position, updated_at desc);

-- posição inicial: mantém a ordem que a tela já mostrava
with ordenadas as (
  select id, row_number() over (
           partition by user_id, coalesce(discipline_id, -1)
           order by updated_at desc
         ) as n
  from notes
)
update notes set position = ordenadas.n
from ordenadas
where notes.id = ordenadas.id and notes.position = 0;

-- ---------- bucket aceita PDF ----------
update storage.buckets
   set allowed_mime_types = array[
         'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'
       ],
       file_size_limit = 20971520          -- 20 MB: PDF de apostila é pesado
 where id = 'anotacoes';

-- ============================ 0008_reordenar_notas.sql ============================

-- =====================================================================
-- 0008 — Reordenar anotações numa única ida ao banco
--
-- Arrastar o card disparava um UPDATE por anotação. Com 20 cards eram 20
-- requisições e a tela só assentava no fim. Esta função recebe os ids na
-- ordem desejada e grava todas as posições de uma vez.
-- Rode no SQL Editor depois da 0007.
-- =====================================================================

create or replace function public.reordenar_notas(p_ids uuid[])
returns void
language sql
security invoker
as $fn$
  update notes
     set position = pos.indice
    from unnest(p_ids) with ordinality as pos(id, indice)
   where notes.id = pos.id
     and notes.user_id = auth.uid();
$fn$;

revoke all on function public.reordenar_notas(uuid[]) from public;
grant execute on function public.reordenar_notas(uuid[]) to authenticated;

-- ============================ 0009_lixeira_anotacoes.sql ============================

-- =====================================================================
-- 0009 — Lixeira das anotações
--
-- Excluir passa a ser em dois tempos: a anotação sai da lista e fica na
-- lixeira (deleted_at preenchido) até ser restaurada ou apagada de vez.
-- Rode no SQL Editor depois da 0008.
-- =====================================================================

alter table notes add column if not exists deleted_at timestamptz;

-- a lista do dia a dia só olha o que não está na lixeira
create index if not exists notes_vivas_idx
  on notes (user_id, deleted_at, pinned desc, position);

-- ============================ 0010_vinculos_e_espaco.sql ============================

-- =====================================================================
-- 0010 — Anotações vinculadas e medidor de espaço
--
-- 1) notes.linked_ids: ids das anotações a que esta aponta. O vínculo é
--    guardado de um lado só; "citada em" sai de varrer as anotações.
-- 2) uso_de_espaco(): tamanho do banco e dos arquivos no bucket, para a
--    barra de espaço no canto da tela. Rode no SQL Editor depois da 0009.
-- =====================================================================

alter table notes add column if not exists linked_ids uuid[] not null default '{}';

create or replace function uso_de_espaco()
returns json
language sql
security definer
set search_path = public, storage
as $$
  select json_build_object(
    'banco',    pg_database_size(current_database()),
    'arquivos', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0)
  );
$$;

revoke all on function uso_de_espaco() from public;
grant execute on function uso_de_espaco() to authenticated;
