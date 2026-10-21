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
