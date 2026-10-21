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
