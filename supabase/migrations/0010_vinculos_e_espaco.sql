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
