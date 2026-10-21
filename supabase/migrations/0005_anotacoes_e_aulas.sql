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
