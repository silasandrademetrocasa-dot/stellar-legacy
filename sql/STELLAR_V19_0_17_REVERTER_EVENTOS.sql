-- STELLAR LEGACY V19.0.17 | Reverte os 35 atributos de evento usando backup atomico.
-- NAO remove os 4 novos IDs, evitando saves com item sem definicao.
-- Valido apenas se meta for versao 10. Se houve edicao ADM posterior, revisar antes.
BEGIN;
DO $revert_event$
DECLARE v_count integer;v_version integer;
BEGIN
 SELECT version INTO v_version FROM public.game_balance_meta_v1909 WHERE id=1 FOR UPDATE;
 IF v_version<>10 THEN RAISE EXCEPTION 'Versao de balanceamento mudou (%). Reversao manual necessaria.',v_version; END IF;
 SELECT count(*) INTO v_count FROM public.game_balance_event_backup_v1917;
 IF v_count<>35 THEN RAISE EXCEPTION 'Backup nao contem 35 itens (%).',v_count; END IF;
 UPDATE public.game_balance_entries_v1909 e
 SET params=b.params,label=b.label,updated_at=now()
 FROM public.game_balance_event_backup_v1917 b WHERE e.kind=b.kind AND e.item_id=b.item_id;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>35 THEN RAISE EXCEPTION 'Reversao incompleta %/35',v_count; END IF;
 UPDATE public.game_balance_meta_v1909 SET version=version+1,updated_at=now() WHERE id=1;
END;
$revert_event$;
COMMIT;
