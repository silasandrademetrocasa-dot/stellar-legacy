-- STELLAR LEGACY V20.1.1 | Ajuste de cadencia PvP 4-X
-- STATUS: JA APLICADO no Supabase de producao em 15/10/2026.
-- NAO EXECUTAR novamente: esta migracao tem protecao contra aplicacao duplicada.
-- Ela altera somente 0.35s => 0.16s na fila de ataque PvP e sincroniza
-- o backup da janela temporaria nivel 1, que se encerra na meia-noite.
BEGIN;
DO $patch$
DECLARE v_current text;
DECLARE v_restore text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO v_current
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='queue_pvp_attack';
 SELECT original_ddl INTO v_restore
 FROM private.stellar_level1_snapshot_20261015
 WHERE scope='rpc' AND ref='queue_pvp_attack';
 IF v_current IS NULL OR v_restore IS NULL
 OR position('0.35 seconds' in v_current)=0
 OR position('0.35 seconds' in v_restore)=0
 OR position('v_attacker.level<1 OR v_target.level<1' in v_current)=0
 OR position('v_attacker.level<15 OR v_target.level<15' in v_restore)=0
 THEN RAISE EXCEPTION 'Codigo PvP alterado ou backup divergente; nao aplicar'; END IF;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='stellar_level1_restore_20261015' AND active)
 THEN RAISE EXCEPTION 'Restauracao temporaria da meia-noite nao encontrada'; END IF;
 CREATE TABLE private.stellar_pvp_cadence_backup_v2011 (
   id integer PRIMARY KEY,
   previous_live_ddl text NOT NULL,
   previous_midnight_ddl text NOT NULL,
   backed_up_at timestamptz NOT NULL DEFAULT now()
 );
 REVOKE ALL ON private.stellar_pvp_cadence_backup_v2011 FROM PUBLIC, anon, authenticated;
 INSERT INTO private.stellar_pvp_cadence_backup_v2011(id,previous_live_ddl,previous_midnight_ddl)
 VALUES(1,v_current,v_restore);
 EXECUTE replace(v_current,'0.35 seconds','0.16 seconds');
 UPDATE private.stellar_level1_snapshot_20261015
 SET original_ddl=replace(original_ddl,'0.35 seconds','0.16 seconds')
 WHERE scope='rpc' AND ref='queue_pvp_attack';
 IF (SELECT count(*) FROM private.stellar_level1_snapshot_20261015
 WHERE scope='rpc' AND position('0.16 seconds' in original_ddl)>0)<>1 THEN
 RAISE EXCEPTION 'Backup da meia-noite nao sincronizado'; END IF;
END;
$patch$;
COMMIT;
