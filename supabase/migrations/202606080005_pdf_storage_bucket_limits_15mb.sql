-- Keep product PDF uploads consistent after Architecture 2.0.
-- PDF files are uploaded directly to Supabase Storage from the browser;
-- server actions receive only storage path/metadata.
-- Required product limit: each PDF up to 15 MB.

update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array['application/pdf']::text[]
where id in (
  'house-documents',
  'house-reports',
  'house-plan-documents'
);
