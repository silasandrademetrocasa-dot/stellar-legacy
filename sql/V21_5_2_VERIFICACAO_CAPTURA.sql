-- DIAGNÓSTICO SEGURO: somente leitura. Nenhuma alteração no banco.
-- Pode ser executado no SQL Editor do Supabase sem interferir com conquistas ou saves.
select
  (select count(*) from public.stellar_warfront_nodes) as pontos_a_b_c,
  (select count(*) from public.stellar_warfront_nodes where owner is not null) as pontos_dominados,
  (select count(*) from public.game_saves) as saves_preservados,
  (select count(*) from public.stellar_war_actions where kind='capture') as conquistas_registradas,
  (select relrowsecurity from pg_class where oid='public.stellar_warfront_nodes'::regclass) as rls_ativo,
  has_table_privilege('authenticated','public.stellar_warfront_nodes','UPDATE') as navegador_pode_mudar_dono,
  has_function_privilege('service_role','public.stellar_commit_warfront_capture(text,text,text,bigint,uuid)','EXECUTE') as servidor_pode_confirmar_captura;
