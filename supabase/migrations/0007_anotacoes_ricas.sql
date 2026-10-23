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
