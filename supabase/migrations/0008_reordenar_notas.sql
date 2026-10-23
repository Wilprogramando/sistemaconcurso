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
