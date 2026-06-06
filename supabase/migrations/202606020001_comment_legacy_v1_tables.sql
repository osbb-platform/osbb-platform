comment on table public.house_sections is
  'LEGACY v1 OSBB house content table. Detached from live house runtime in Architecture 2.0 release; kept temporarily for audit/quarantine. Do not use for new house content. Candidate for DROP only after production observation and a dedicated cleanup migration.';

comment on table public.house_pages is
  'LEGACY v1 OSBB house page-shell table. Partially retained for compatibility services during Architecture 2.0 release. Do not use for new house content. Candidate for DROP only after page-shell compatibility is removed.';

comment on table public.content_versions is
  'LEGACY v1 content version table. House-section versioning is quarantined in src/legacy-v1; remaining company-module references are a separate legacy subsystem. Candidate for DROP only after a dedicated cleanup migration.';

comment on table public.platform_change_history is
  'LEGACY v1 platform history table. House content history migrated to house_content_history/content-engine pipeline; retained temporarily for audit/backward compatibility. Candidate for DROP only after production observation and a dedicated cleanup migration.';
