-- V113.1 • Fragmentos AUX-9: concedidos somente em kill confirmado pelo PostgreSQL.
-- APLICAR UMA VEZ no Supabase, antes de ativar o pacote Web/Render.
-- Nunca concede fragmentos ao navegador sem recibo; jogador não pode editar RPC.
CREATE TABLE IF NOT EXISTS public.stellar_aux_protocol_drop_rules_v1131 (
 source text PRIMARY KEY CHECK(source IN ('apex','universo')),
 chance numeric NOT NULL CHECK(chance>=0 AND chance<=0.25),
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_aux_protocol_drop_rules_v1131(source,chance,enabled)
 VALUES ('apex',0.10,true),('universo',0.10,true)
 ON CONFLICT(source) DO NOTHING;
ALTER TABLE public.stellar_aux_protocol_drop_rules_v1131 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_aux_protocol_drop_rules_v1131 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stellar_aux_protocol_drop_rules_v1131 TO service_role;

CREATE TABLE IF NOT EXISTS public.stellar_aux_protocol_drop_receipts_v1131 (
 user_id uuid NOT NULL,
 kill_key text NOT NULL,
 npc_type text NOT NULL,
 fragment_kind text NOT NULL CHECK(fragment_kind IN ('apex','universo')),
 qty integer NOT NULL CHECK(qty IN (0,1)),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,kill_key)
);
CREATE INDEX IF NOT EXISTS stellar_aux_protocol_drop_receipts_created_v1131
 ON public.stellar_aux_protocol_drop_receipts_v1131(created_at DESC);
ALTER TABLE public.stellar_aux_protocol_drop_receipts_v1131 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_aux_protocol_drop_receipts_v1131 FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT ON public.stellar_aux_protocol_drop_receipts_v1131 TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_grant_npc_reward_v1131(
 p_user_id uuid, p_kill_key text, p_npc_type text,
 p_base_credits bigint, p_base_stl bigint, p_owner_eligible boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp'
AS $v1131$
DECLARE
 v_reward jsonb;
 v_kind text;
 v_chance numeric;
 v_qty integer;
 v_new boolean:=false;
 v_insert_count integer:=0;
 v_save jsonb;
 v_old integer;
 v_balance integer;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF p_user_id IS NULL OR p_kill_key IS NULL OR length(p_kill_key)>180 OR length(p_kill_key)<3 THEN
  RAISE EXCEPTION 'NPC_REWARD_ID_INVALID';
 END IF;
 -- Recompensa original e fragmento são confirmados ou revertidos juntos.
 v_reward:=public.stellar_grant_npc_reward_v228(
   p_user_id,p_kill_key,p_npc_type,p_base_credits,p_base_stl);
 IF NOT p_owner_eligible THEN RETURN v_reward; END IF;
 IF p_npc_type='apexOverlord' THEN v_kind:='apex';
 ELSIF p_kill_key ~ '^(earth|mars|jupiter):u[123]:' THEN v_kind:='universo';
 ELSE RETURN v_reward;
 END IF;
 SELECT chance INTO v_chance FROM public.stellar_aux_protocol_drop_rules_v1131
 WHERE source=v_kind AND enabled=true;
 IF NOT FOUND THEN RETURN v_reward; END IF;
 IF coalesce((v_reward->>'granted')::boolean,false) THEN
  v_qty:=CASE WHEN random()<v_chance THEN 1 ELSE 0 END;
  INSERT INTO public.stellar_aux_protocol_drop_receipts_v1131(user_id,kill_key,npc_type,fragment_kind,qty)
  VALUES(p_user_id,p_kill_key,p_npc_type,v_kind,v_qty)
  ON CONFLICT(user_id,kill_key) DO NOTHING;
  GET DIAGNOSTICS v_insert_count=ROW_COUNT;
  v_new:=v_insert_count=1;
 END IF;
 SELECT fragment_kind,qty INTO v_kind,v_qty FROM public.stellar_aux_protocol_drop_receipts_v1131
 WHERE user_id=p_user_id AND kill_key=p_kill_key;
 IF NOT FOUND OR v_qty<>1 THEN RETURN v_reward; END IF;
 SELECT state INTO v_save FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF v_save IS NULL THEN RAISE EXCEPTION 'AUX_FRAGMENT_SAVE_MISSING'; END IF;
 v_old:=GREATEST(0,LEAST(1000000,coalesce((v_save#>>ARRAY['pet','advancedProtocolFragmentsV1131',v_kind])::integer,0)));
 IF v_new THEN
  IF v_old>=1000000 THEN RAISE EXCEPTION 'AUX_FRAGMENT_STOCK_LIMIT'; END IF;
  v_balance:=v_old+1;
  -- Merge do objeto pet antes de escrever a chave aninhada.
  v_save:=jsonb_set(v_save,'{pet}',coalesce(v_save->'pet','{}'::jsonb),true);
  v_save:=jsonb_set(v_save,'{pet,advancedProtocolFragmentsV1131}',
     coalesce(v_save#>'{pet,advancedProtocolFragmentsV1131}','{}'::jsonb)
       ||jsonb_build_object(v_kind,v_balance),true);
  UPDATE public.game_saves SET state=v_save,updated_at=now() WHERE user_id=p_user_id;
 ELSE v_balance:=v_old;
 END IF;
 RETURN v_reward||jsonb_build_object('protocolFragment',
  jsonb_build_object('kind',v_kind,'qty',1,'balance',v_balance));
END;
$v1131$;

REVOKE ALL ON FUNCTION public.stellar_grant_npc_reward_v1131(uuid,text,text,bigint,bigint,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_grant_npc_reward_v1131(uuid,text,text,bigint,bigint,boolean)
 TO service_role;
NOTIFY pgrst,'reload schema';
