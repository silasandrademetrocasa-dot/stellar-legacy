-- Stellar Legacy V38.1.0 — Astral Rewards
-- Requer V19.0.6 (galaxy_gate_config_v1906) e saves V38.0.0.
-- Aplique ANTES de publicar o ZIP. Prêmios V38.1 são adicionais aos legados.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_astral_config_v381 (
 gate text PRIMARY KEY CHECK (gate IN ('alpha','beta','gamma')),
 config jsonb NOT NULL CHECK (jsonb_typeof(config)='object'),
 revision bigint NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid
);
ALTER TABLE public.stellar_astral_config_v381 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_astral_config_v381 FROM PUBLIC,anon,authenticated;
INSERT INTO public.stellar_astral_config_v381(gate,config) VALUES
 ('alpha','{"label":"AURORA","resource":"Aurorium","referenceWaves":18,"credits":2500000,"stl":1500,"cores":15,"ammoId":"mcb25","ammoQty":1500,"rocketId":"plt2026","rocketQty":30,"voidite":3,"resourceQty":6,"weeklyBonusPct":25}'::jsonb),
 ('beta','{"label":"NEXUS","resource":"Nexium","referenceWaves":21,"credits":6000000,"stl":3500,"cores":35,"ammoId":"mcb50","ammoQty":2800,"rocketId":"plt2021","rocketQty":60,"voidite":7,"resourceQty":12,"weeklyBonusPct":30}'::jsonb),
 ('gamma','{"label":"ECLIPSE","resource":"Eclipsium","referenceWaves":24,"credits":15000000,"stl":8000,"cores":75,"ammoId":"ucb100","ammoQty":5000,"rocketId":"plt3030","rocketQty":120,"voidite":15,"resourceQty":25,"weeklyBonusPct":40}'::jsonb)
ON CONFLICT(gate) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_astral_cursor_v381 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 gate text NOT NULL CHECK (gate IN ('alpha','beta','gamma')),
 last_completed bigint NOT NULL DEFAULT 0 CHECK(last_completed>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,gate)
);
ALTER TABLE public.stellar_astral_cursor_v381 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_astral_cursor_v381 FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.stellar_astral_ledger_v381 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 gate text NOT NULL CHECK (gate IN ('alpha','beta','gamma')),
 completion_number bigint NOT NULL CHECK(completion_number>0),
 week_id text NOT NULL,
 first_weekly boolean NOT NULL DEFAULT false,
 quote jsonb NOT NULL,
 config_revision bigint NOT NULL,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,gate,completion_number)
);
CREATE INDEX IF NOT EXISTS stellar_astral_ledger_user_date ON public.stellar_astral_ledger_v381(user_id,claimed_at DESC);
ALTER TABLE public.stellar_astral_ledger_v381 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_astral_ledger_v381 FROM PUBLIC,anon,authenticated;
-- Prêmio congelado antes da batalha: o ADM não muda um prêmio em andamento.
CREATE TABLE IF NOT EXISTS public.stellar_astral_quote_lock_v381 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 gate text NOT NULL CHECK(gate IN ('alpha','beta','gamma')),
 completion_number bigint NOT NULL CHECK(completion_number>0),
 quote jsonb NOT NULL,
 config_revision bigint NOT NULL,
 week_id text NOT NULL,
 locked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,gate,completion_number)
);
ALTER TABLE public.stellar_astral_quote_lock_v381 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_astral_quote_lock_v381 FROM PUBLIC,anon,authenticated;
-- Marca o histórico anterior como já contabilizado, sem pagar novamente.
INSERT INTO public.stellar_astral_cursor_v381(user_id,gate,last_completed)
SELECT s.user_id,g.gate,GREATEST(0,COALESCE((CASE WHEN (s.state#>>ARRAY['galaxyGate',g.gate,'completed']) ~ '^[0-9]{1,12}$' THEN (s.state#>>ARRAY['galaxyGate',g.gate,'completed'])::bigint ELSE 0 END),0))
FROM public.game_saves s CROSS JOIN (VALUES('alpha'),('beta'),('gamma')) AS g(gate)
ON CONFLICT(user_id,gate) DO NOTHING;

-- O mesmo cálculo é usado tanto no painel de prévia como na concessão real.
CREATE OR REPLACE FUNCTION public.stellar_astral_quote_v381(p_gate text,p_first_weekly boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE c jsonb; live jsonb; v_waves integer; v_enemy numeric:=1; v_damage numeric:=1; v_mult numeric; v_bonus numeric;
BEGIN
 IF p_gate NOT IN ('alpha','beta','gamma') THEN RAISE EXCEPTION 'ASTRAL_GATE_INVALID'; END IF;
 SELECT config INTO c FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 IF c IS NULL THEN RAISE EXCEPTION 'ASTRAL_CONFIG_MISSING'; END IF;
 SELECT config->p_gate INTO live FROM public.galaxy_gate_config_v1906 WHERE id=1;
 SELECT COALESCE(sum(jsonb_array_length(r.value->'waves')),0)::integer INTO v_waves
 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(live->'rounds')='array' THEN live->'rounds' ELSE '[]'::jsonb END) r;
 IF v_waves<1 THEN v_waves:=(c->>'referenceWaves')::integer; END IF;
 IF (live->>'enemyScale') ~ '^[0-9]+(\.[0-9]+)?$' THEN v_enemy:=least(3,greatest(0.25,(live->>'enemyScale')::numeric)); END IF;
 IF (live->>'damageScale') ~ '^[0-9]+(\.[0-9]+)?$' THEN v_damage:=least(3,greatest(0.25,(live->>'damageScale')::numeric)); END IF;
 v_mult:=round(greatest(0.5,least(3,(v_waves::numeric/(c->>'referenceWaves')::numeric)*sqrt(v_enemy*v_damage))),3);
 v_bonus:=CASE WHEN p_first_weekly THEN 1+(c->>'weeklyBonusPct')::numeric/100 ELSE 1 END;
 RETURN jsonb_build_object('gate',p_gate,'label',c->>'label','resource',c->>'resource',
  'waves',v_waves,'difficultyMult',v_mult,'firstWeekly',p_first_weekly,'weeklyBonusPct',(c->>'weeklyBonusPct')::integer,
  'credits',round((c->>'credits')::numeric*v_mult*v_bonus)::bigint,
  'stl',round((c->>'stl')::numeric*v_mult*v_bonus)::bigint,
  'cores',round((c->>'cores')::numeric*v_mult*v_bonus)::bigint,
  'ammoId',c->>'ammoId','ammoQty',round((c->>'ammoQty')::numeric*v_mult)::bigint,
  'rocketId',c->>'rocketId','rocketQty',round((c->>'rocketQty')::numeric*v_mult)::bigint,
  'voidite',round((c->>'voidite')::numeric*v_mult)::bigint,
  'resourceQty',round((c->>'resourceQty')::numeric*v_mult*v_bonus)::bigint);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_astral_quote_v381(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_astral_quote_v381(text,boolean) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.stellar_astral_lock_quote_v381(p_gate text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); s jsonb; n bigint; last_n bigint; q jsonb; rev bigint; wk text;
BEGIN
 IF u IS NULL OR p_gate NOT IN ('alpha','beta','gamma') THEN RAISE EXCEPTION 'ASTRAL_LOCK_INVALID' USING ERRCODE='42501'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=u;
 IF s IS NULL THEN RAISE EXCEPTION 'ASTRAL_SAVE_MISSING'; END IF;
 n:=greatest(0,coalesce((s#>>ARRAY['galaxyGate',p_gate,'completed'])::bigint,0));
 SELECT last_completed INTO last_n FROM public.stellar_astral_cursor_v381 WHERE user_id=u AND gate=p_gate;
 last_n:=coalesce(last_n,0);
 IF n>last_n THEN
   SELECT quote INTO q FROM public.stellar_astral_quote_lock_v381 WHERE user_id=u AND gate=p_gate AND completion_number=last_n+1;
   RETURN jsonb_build_object('locked',q IS NOT NULL,'pending',n-last_n,'quote',q);
 END IF;
 IF n<last_n THEN RAISE EXCEPTION 'ASTRAL_SAVE_STALE'; END IF;
 IF coalesce((s#>>ARRAY['galaxyGate',p_gate,'built'])::boolean,false)=false THEN
   RETURN jsonb_build_object('locked',false,'pending',0,'reason','GATE_NOT_BUILT');
 END IF;
 wk:=to_char(timezone('America/Sao_Paulo',now()),'IYYY-IW');
 q:=public.stellar_astral_quote_v381(p_gate,NOT EXISTS(
 SELECT 1 FROM public.stellar_astral_ledger_v381 WHERE user_id=u AND gate=p_gate AND week_id=wk));
 SELECT revision INTO rev FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 INSERT INTO public.stellar_astral_quote_lock_v381(user_id,gate,completion_number,quote,config_revision,week_id)
 VALUES(u,p_gate,last_n+1,q,rev,wk) ON CONFLICT DO NOTHING;
 SELECT quote INTO q FROM public.stellar_astral_quote_lock_v381 WHERE user_id=u AND gate=p_gate AND completion_number=last_n+1;
 RETURN jsonb_build_object('locked',true,'pending',0,'quote',q);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_astral_lock_quote_v381(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_astral_lock_quote_v381(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_astral_dashboard_v381()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); row record; s jsonb; result jsonb:='{}'::jsonb; history jsonb; current_count bigint; last_count bigint; wk text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'ASTRAL_AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 wk:=to_char(timezone('America/Sao_Paulo',now()),'IYYY-IW');
 SELECT state INTO s FROM public.game_saves WHERE user_id=u;
 FOR row IN SELECT gate,config,revision FROM public.stellar_astral_config_v381 ORDER BY gate LOOP
  current_count:=GREATEST(0,COALESCE((s#>>ARRAY['galaxyGate',row.gate,'completed'])::bigint,0));
  SELECT last_completed INTO last_count FROM public.stellar_astral_cursor_v381 WHERE user_id=u AND gate=row.gate;
  -- Se o SQL for aplicado antes do cadastro, cursor ausente equivale a zero.
  result:=jsonb_set(result,ARRAY[row.gate],jsonb_build_object(
   'quote',COALESCE((SELECT ql.quote FROM public.stellar_astral_quote_lock_v381 ql
      WHERE ql.user_id=u AND ql.gate=row.gate AND ql.completion_number=coalesce(last_count,0)+1),
      public.stellar_astral_quote_v381(row.gate,NOT EXISTS(
      SELECT 1 FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.gate=row.gate AND l.week_id=wk))),
   'config',row.config,'revision',row.revision,
   'pending',greatest(0,current_count-coalesce(last_count,0)),
   'materialBalance',coalesce((s#>>ARRAY['cargo',row.config->>'resource'])::bigint,0)),true);
 END LOOP;
 SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.claimed_at DESC),'[]'::jsonb) INTO history FROM
  (SELECT gate,completion_number,week_id,first_weekly,quote,claimed_at FROM public.stellar_astral_ledger_v381
   WHERE user_id=u ORDER BY claimed_at DESC LIMIT 20) t;
 RETURN jsonb_build_object('gates',result,'history',history,'week',wk);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_astral_dashboard_v381() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_astral_dashboard_v381() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_admin_set_astral_v381(p_gate text,p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE c jsonb; k text; limits jsonb:='{"referenceWaves":100,"credits":50000000,"stl":50000,"cores":500,"ammoQty":40000,"rocketQty":1000,"voidite":200,"resourceQty":200,"weeklyBonusPct":100}'::jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ASTRAL_ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_gate NOT IN ('alpha','beta','gamma') OR jsonb_typeof(p_config)<>'object' THEN RAISE EXCEPTION 'ASTRAL_CONFIG_INVALID'; END IF;
 SELECT config INTO c FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 IF c IS NULL THEN RAISE EXCEPTION 'ASTRAL_GATE_INVALID'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_config) LOOP
  IF NOT (limits ? k OR k IN ('ammoId','rocketId')) THEN RAISE EXCEPTION 'ASTRAL_FIELD_INVALID %',k; END IF;
  IF limits ? k THEN
    IF jsonb_typeof(p_config->k)<>'number' OR (p_config->>k)::numeric<0 OR (p_config->>k)::numeric>(limits->>k)::numeric OR (p_config->>k)::numeric<>trunc((p_config->>k)::numeric)
    THEN RAISE EXCEPTION 'ASTRAL_AMOUNT_INVALID %',k; END IF;
    IF k='referenceWaves' AND (p_config->>k)::integer<1 THEN RAISE EXCEPTION 'ASTRAL_WAVES_INVALID'; END IF;
  ELSIF k='ammoId' AND (p_config->>k) NOT IN ('lcb10','mcb25','mcb50','ucb100','sab50') THEN RAISE EXCEPTION 'ASTRAL_AMMO_INVALID';
  ELSIF k='rocketId' AND (p_config->>k) NOT IN ('r310','plt2026','plt2021','plt3030') THEN RAISE EXCEPTION 'ASTRAL_ROCKET_INVALID'; END IF;
 END LOOP;
 UPDATE public.stellar_astral_config_v381 SET config=c||p_config,revision=revision+1,updated_at=now(),updated_by=auth.uid() WHERE gate=p_gate;
 RETURN public.stellar_astral_dashboard_v381();
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_admin_set_astral_v381(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_admin_set_astral_v381(text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_claim_astral_v381(p_user_id uuid,p_gate text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE s jsonb; n bigint; last_n bigint; wk text; lock_week text; weekly boolean; q jsonb; rev bigint; cr bigint; stl bigint; cores bigint;
        c jsonb; a jsonb; rockets jsonb; bio jsonb; prof jsonb; res text; v bigint;
BEGIN
 IF p_user_id IS NULL OR p_gate NOT IN ('alpha','beta','gamma') THEN RAISE EXCEPTION 'ASTRAL_INVALID_CLAIM'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ASTRAL_SAVE_MISSING'; END IF;
 n:=greatest(0,coalesce((s#>>ARRAY['galaxyGate',p_gate,'completed'])::bigint,0));
 INSERT INTO public.stellar_astral_cursor_v381(user_id,gate,last_completed) VALUES(p_user_id,p_gate,0) ON CONFLICT DO NOTHING;
 SELECT last_completed INTO last_n FROM public.stellar_astral_cursor_v381 WHERE user_id=p_user_id AND gate=p_gate FOR UPDATE;
 IF n<=last_n THEN RETURN jsonb_build_object('claimed',false,'reason','NO_PENDING_COMPLETION'); END IF;
 wk:=to_char(timezone('America/Sao_Paulo',now()),'IYYY-IW');
 weekly:=NOT EXISTS(SELECT 1 FROM public.stellar_astral_ledger_v381 WHERE user_id=p_user_id AND gate=p_gate AND week_id=wk);
 SELECT locked.quote,locked.config_revision,locked.week_id INTO q,rev,lock_week
 FROM public.stellar_astral_quote_lock_v381 locked
 WHERE locked.user_id=p_user_id AND locked.gate=p_gate AND locked.completion_number=last_n+1 FOR UPDATE;
 IF q IS NULL THEN
   q:=public.stellar_astral_quote_v381(p_gate,weekly);
   SELECT revision INTO rev FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 ELSE
   wk:=lock_week;
   weekly:=(q->>'firstWeekly')::boolean;
 END IF;
 INSERT INTO public.stellar_astral_ledger_v381(user_id,gate,completion_number,week_id,first_weekly,quote,config_revision)
 VALUES(p_user_id,p_gate,last_n+1,wk,weekly,q,rev);
 cr:=(q->>'credits')::bigint;stl:=(q->>'stl')::bigint;cores:=(q->>'cores')::bigint;res:=q->>'resource';
 prof:=coalesce(s->'profile','{}'::jsonb);
 prof:=prof||jsonb_build_object('credits',coalesce((prof->>'credits')::bigint,0)+cr,'uridium',coalesce((prof->>'uridium')::bigint,0)+stl);
 s:=jsonb_set(s,'{profile}',prof,true);
 bio:=coalesce(s->'pilotBio','{}'::jsonb);
 bio:=bio||jsonb_build_object('logDisks',coalesce((bio->>'logDisks')::bigint,0)+cores);
 s:=jsonb_set(s,'{pilotBio}',bio,true);
 c:=coalesce(s->'cargo','{}'::jsonb);
 c:=c||jsonb_build_object('Xenomit',coalesce((c->>'Xenomit')::bigint,0)+(q->>'voidite')::bigint,
   res,coalesce((c->>res)::bigint,0)+(q->>'resourceQty')::bigint);
 s:=jsonb_set(s,'{cargo}',c,true);
 a:=coalesce(s->'ammo','{}'::jsonb);
 a:=a||jsonb_build_object(q->>'ammoId',coalesce((a->>(q->>'ammoId'))::bigint,0)+(q->>'ammoQty')::bigint);
 s:=jsonb_set(s,'{ammo}',a,true);
 rockets:=coalesce(s->'rockets','{}'::jsonb);
 rockets:=rockets||jsonb_build_object(q->>'rocketId',coalesce((rockets->>(q->>'rocketId'))::bigint,0)+(q->>'rocketQty')::bigint);
 s:=jsonb_set(s,'{rockets}',rockets,true);
 -- Usa a revisão de compras já reconhecida pelo backend para bloquear saves antigos.
 s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(coalesce((s->>'serverPurchaseRevision')::bigint,0)+1),true);
 UPDATE public.game_saves SET state=s,updated_at=now() WHERE user_id=p_user_id;
 UPDATE public.profiles SET credits=(prof->>'credits')::bigint,uridium=(prof->>'uridium')::bigint,updated_at=now() WHERE id=p_user_id;
 UPDATE public.stellar_astral_cursor_v381 SET last_completed=last_n+1,updated_at=now() WHERE user_id=p_user_id AND gate=p_gate;
 DELETE FROM public.stellar_astral_quote_lock_v381 WHERE user_id=p_user_id AND gate=p_gate AND completion_number=last_n+1;
 RETURN jsonb_build_object('claimed',true,'quote',q,'completion',last_n+1,'revision',s->'serverPurchaseRevision');
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_claim_astral_v381(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_claim_astral_v381(uuid,text) TO service_role;
COMMIT;
