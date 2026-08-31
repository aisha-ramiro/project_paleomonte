-- Permite que a equipe editorial consulte arquivos privados do acervo,
-- incluindo a imagem do QR Code gerada no cadastro da espécie.

drop policy if exists "content managers can read museum media files" on storage.objects;

create policy "content managers can read museum media files"
  on storage.objects for select
  using (bucket_id = 'museum-media' and public.is_content_manager());
