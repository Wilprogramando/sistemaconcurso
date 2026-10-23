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
