-- Stellar Legacy — V39.0 a V42.0 — Unified Expansion (instalação incremental)
-- REQUER V38.1.0 e V22.8 NPC ledger. SQL não remove saves nem concede prêmios retroativos.
-- Conteúdo executável: Astral Forge (colecionáveis), Squads (até quatro),
-- expedições assíncronas, pesquisa de facção e ranking semanal de abates verificados.
-- NÃO altera dano, movimento, mapas ou bônus de combate no cliente.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.stellar_u42_catalog (
 code text PRIMARY KEY CHECK (code ~ '^[a-z0-9_]{2,48}$'),
 kind text NOT NULL CHECK (kind IN ('forge','expedition','project')),
 title text NOT NULL CHECK (length(title) BETWEEN 3 AND 80),
 rule jsonb NOT NULL CHECK(jsonb_typeof(rule)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_u42_catalog(code,kind,title,rule) VALUES
('astral_guard','forge','Módulo Guardião Astral','{"cost":{"Aurorium":6,"Nexium":1},"item":"astral_guard"}'),
('nexus_drive','forge','Núcleo de Navegação Nexus','{"cost":{"Aurorium":2,"Nexium":8},"item":"nexus_drive"}'),
('eclipse_lance','forge','Lança de Energia Eclipse','{"cost":{"Nexium":5,"Eclipsium":12},"item":"eclipse_lance"}'),
('trinity_matrix','forge','Matriz Trina','{"cost":{"Aurorium":10,"Nexium":10,"Eclipsium":10},"item":"trinity_matrix"}'),
('ion_scan','expedition','Varredura Iônica','{"credits":25000,"minutes":20,"research":15}'),
('dark_survey','expedition','Reconhecimento do Vazio','{"credits":65000,"minutes":45,"research":45}'),
('rift_probe','expedition','Sonda Interdimensional','{"credits":140000,"minutes":90,"research":110}'),
('defense','project','Bastião das Facções','{"resource":"Aurorium","perPoint":1,"goal":1500}'),
('navigation','project','Rede de Navegação','{"resource":"Nexium","perPoint":1,"goal":1500}'),
('arsenal','project','Centro de Tecnologia','{"resource":"Eclipsium","perPoint":1,"goal":1500}')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.stellar_u42_inventory (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 item text NOT NULL REFERENCES public.stellar_u42_catalog(code),
 quantity bigint NOT NULL DEFAULT 0 CHECK(quantity BETWEEN 0 AND 1000000),
 PRIMARY KEY(user_id,item)
);
CREATE TABLE IF NOT EXISTS public.stellar_u42_squads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 invite_code text NOT NULL UNIQUE CHECK(length(invite_code)=8),
 faction text NOT NULL CHECK(length(faction) BETWEEN 2 AND 30),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.stellar_u42_squad_members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 squad_id uuid NOT NULL REFERENCES public.stellar_u42_squads(id) ON DELETE CASCADE,
 joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stellar_u42_squad_members_squad_idx ON public.stellar_u42_squad_members(squad_id);
CREATE TABLE IF NOT EXISTS public.stellar_u42_expeditions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 code text NOT NULL REFERENCES public.stellar_u42_catalog(code),
 started_at timestamptz NOT NULL DEFAULT now(),
 ready_at timestamptz NOT NULL,
 reward_points integer NOT NULL CHECK(reward_points BETWEEN 1 AND 10000),
 claimed_at timestamptz
);
CREATE INDEX IF NOT EXISTS stellar_u42_expeditions_user_idx ON public.stellar_u42_expeditions(user_id,started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS stellar_u42_one_pending_expedition ON public.stellar_u42_expeditions(user_id) WHERE claimed_at IS NULL;
CREATE TABLE IF NOT EXISTS public.stellar_u42_research (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 points bigint NOT NULL DEFAULT 0 CHECK(points BETWEEN 0 AND 100000000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.stellar_u42_donations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 faction text NOT NULL,
 project_code text NOT NULL REFERENCES public.stellar_u42_catalog(code),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 donated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stellar_u42_donations_faction_idx ON public.stellar_u42_donations(faction,project_code);
-- Auditoria autoritativa do gasto dos três recursos exclusivos.
CREATE TABLE IF NOT EXISTS public.stellar_u42_material_spends (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 material text NOT NULL CHECK(material IN ('Aurorium','Nexium','Eclipsium')),
 quantity bigint NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 spent_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_id,material)
);
CREATE INDEX IF NOT EXISTS stellar_u42_material_spends_idx ON public.stellar_u42_material_spends(user_id,material);
CREATE TABLE IF NOT EXISTS public.stellar_u42_actions (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 action text NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS stellar_u42_actions_time_idx ON public.stellar_u42_actions(user_id,created_at DESC);

DO $do$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['stellar_u42_catalog','stellar_u42_inventory','stellar_u42_squads','stellar_u42_squad_members',
 'stellar_u42_expeditions','stellar_u42_research','stellar_u42_donations','stellar_u42_material_spends','stellar_u42_actions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END;$do$;

-- Soma confiável por facção a partir do ledger existente de abates: não aceita pontos enviados pelo navegador.
CREATE OR REPLACE FUNCTION public.stellar_u42_dashboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); s jsonb; f text; squad_data jsonb; expeditions_data jsonb;
 item_data jsonb; score_data jsonb; project_data jsonb; research_value bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=u;
 SELECT faction INTO f FROM public.profiles WHERE id=u;
 IF s IS NULL THEN RETURN jsonb_build_object('error','SAVE_MISSING'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',c.code,'quantity',i.quantity)),'[]'::jsonb)
 INTO item_data FROM public.stellar_u42_inventory i JOIN public.stellar_u42_catalog c ON c.code=i.item WHERE i.user_id=u;
 SELECT coalesce((SELECT jsonb_build_object('code',q.invite_code,'faction',q.faction,'owner',q.owner_id=u,
  'members',(SELECT count(*) FROM public.stellar_u42_squad_members m WHERE m.squad_id=q.id))
  FROM public.stellar_u42_squads q JOIN public.stellar_u42_squad_members m ON m.squad_id=q.id WHERE m.user_id=u),'null'::jsonb)
 INTO squad_data;
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',e.code,'readyAt',e.ready_at,'reward',e.reward_points,
 'claimed',e.claimed_at IS NOT NULL) ORDER BY e.started_at DESC),'[]'::jsonb)
 INTO expeditions_data FROM (SELECT * FROM public.stellar_u42_expeditions WHERE user_id=u ORDER BY started_at DESC LIMIT 12) e;
 SELECT coalesce(points,0) INTO research_value FROM public.stellar_u42_research WHERE user_id=u;
 SELECT coalesce(jsonb_agg(jsonb_build_object('faction',t.faction,'verifiedKills',t.kills) ORDER BY t.kills DESC),'[]'::jsonb)
 INTO score_data FROM (
  SELECT p.faction,count(*)::bigint AS kills FROM public.stellar_npc_reward_ledger n
  JOIN public.profiles p ON p.id=n.user_id
  WHERE n.issued_at >= now()-interval '7 days' AND p.faction IS NOT NULL
  GROUP BY p.faction ORDER BY kills DESC LIMIT 8
 ) t;
 SELECT coalesce(jsonb_agg(jsonb_build_object('faction',x.faction,'project',x.project_code,'total',x.total)),'[]'::jsonb)
 INTO project_data FROM (SELECT faction,project_code,sum(quantity)::bigint AS total
 FROM public.stellar_u42_donations GROUP BY faction,project_code ORDER BY faction,project_code LIMIT 60) x;
 RETURN jsonb_build_object(
 'catalog',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',code,'kind',kind,'title',title,'rule',rule) ORDER BY kind,code),'[]'::jsonb) FROM public.stellar_u42_catalog),
 'materials',jsonb_build_object('Aurorium',coalesce(s#>'{cargo,Aurorium}','0'::jsonb),'Nexium',coalesce(s#>'{cargo,Nexium}','0'::jsonb),'Eclipsium',coalesce(s#>'{cargo,Eclipsium}','0'::jsonb)),
 'credits',coalesce(s#>'{profile,credits}','0'::jsonb),'faction',f,'isAdmin',public.is_game_admin_v1763(u),'items',item_data,'squad',squad_data,
 'expeditions',expeditions_data,'researchPoints',coalesce(research_value,0),'warScores',score_data,'projects',project_data);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u42_dashboard() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u42_dashboard() TO authenticated;

-- Economia e operações de expedição atômicas no PostgreSQL, com idempotência por solicitação.
CREATE OR REPLACE FUNCTION public.stellar_u42_action(p_action text,p_code text,p_quantity integer,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); s jsonb; cfg jsonb; kind text; f text;
 v_mat record; res_name text; have bigint; debit bigint; issued bigint; spent bigint; cargo jsonb; prof jsonb;
 exp_row public.stellar_u42_expeditions%ROWTYPE; prior jsonb; outcome jsonb;
 cost bigint; revision bigint; research_award integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_action NOT IN ('forge','expedition_start','expedition_claim','donate')
 OR p_quantity NOT BETWEEN 1 AND 100 OR p_code !~ '^[a-z0-9_]{2,48}$' THEN RAISE EXCEPTION 'ACTION_INVALID'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 SELECT result INTO prior FROM public.stellar_u42_actions WHERE user_id=u AND request_id=p_request_id;
 IF FOUND THEN RETURN prior; END IF;
 SELECT c.rule,c.kind INTO cfg,kind FROM public.stellar_u42_catalog c WHERE c.code=p_code;
 IF NOT FOUND THEN RAISE EXCEPTION 'CATALOG_MISSING'; END IF;
 prof:=coalesce(s->'profile','{}'::jsonb);
 cargo:=coalesce(s->'cargo','{}'::jsonb);
 IF p_action='forge' THEN
  IF kind<>'forge' OR p_quantity>5 THEN RAISE EXCEPTION 'FORGE_INVALID'; END IF;
  FOR v_mat IN SELECT key,value FROM jsonb_each_text(cfg->'cost') LOOP
   debit:=v_mat.value::bigint*p_quantity;
   have:=coalesce((cargo->>v_mat.key)::bigint,0);
   -- Não confiar no cargo isoladamente: somente materiais creditados no ledger Astral V38.1.
   SELECT coalesce(sum((l.quote->>'resourceQty')::bigint),0) INTO issued
     FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.quote->>'resource'=v_mat.key;
   SELECT coalesce(sum(t.quantity),0) INTO spent FROM public.stellar_u42_material_spends t
     WHERE t.user_id=u AND t.material=v_mat.key;
   IF have<debit OR issued-spent<debit THEN RAISE EXCEPTION 'MATERIAL_NOT_VERIFIED: %',v_mat.key; END IF;
   cargo:=jsonb_set(cargo,ARRAY[v_mat.key],to_jsonb(have-debit),true);
   IF debit>0 THEN INSERT INTO public.stellar_u42_material_spends(user_id,request_id,material,quantity)
      VALUES(u,p_request_id,v_mat.key,debit); END IF;
  END LOOP;
  INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,p_code,p_quantity)
  ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
  outcome:=jsonb_build_object('ok',true,'action',p_action,'code',p_code,'quantity',p_quantity,
   'notice','Protótipo criado no inventário de pesquisa. Bônus de combate ainda não ativados.');
 ELSIF p_action='expedition_start' THEN
  IF kind<>'expedition' OR p_quantity<>1 THEN RAISE EXCEPTION 'EXPEDITION_INVALID'; END IF;
  IF EXISTS(SELECT 1 FROM public.stellar_u42_expeditions WHERE user_id=u AND claimed_at IS NULL) THEN
   RAISE EXCEPTION 'EXPEDITION_ALREADY_RUNNING'; END IF;
  cost:=(cfg->>'credits')::bigint;
  have:=coalesce((prof->>'credits')::bigint,0);
  IF have<cost THEN RAISE EXCEPTION 'CREDITS_INSUFFICIENT'; END IF;
  prof:=jsonb_set(prof,'{credits}',to_jsonb(have-cost),true);
  INSERT INTO public.stellar_u42_expeditions(user_id,code,ready_at,reward_points)
  VALUES(u,p_code,now()+make_interval(mins=>(cfg->>'minutes')::integer),(cfg->>'research')::integer)
  RETURNING * INTO exp_row;
  UPDATE public.profiles SET credits=have-cost,updated_at=now() WHERE id=u;
  outcome:=jsonb_build_object('ok',true,'action',p_action,'readyAt',exp_row.ready_at,'expeditionId',exp_row.id);
 ELSIF p_action='expedition_claim' THEN
  IF kind<>'expedition' OR p_quantity<>1 THEN RAISE EXCEPTION 'EXPEDITION_INVALID'; END IF;
  SELECT * INTO exp_row FROM public.stellar_u42_expeditions
  WHERE user_id=u AND code=p_code AND claimed_at IS NULL ORDER BY started_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXPEDITION_MISSING'; END IF;
  IF exp_row.ready_at>now() THEN RAISE EXCEPTION 'EXPEDITION_NOT_READY'; END IF;
  UPDATE public.stellar_u42_expeditions SET claimed_at=now() WHERE id=exp_row.id;
  research_award:=exp_row.reward_points;
  INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,research_award)
   ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
  outcome:=jsonb_build_object('ok',true,'action',p_action,'researchPoints',research_award);
 ELSIF p_action='donate' THEN
  IF kind<>'project' THEN RAISE EXCEPTION 'PROJECT_INVALID'; END IF;
  SELECT faction INTO f FROM public.profiles WHERE id=u;
  IF f IS NULL OR length(f)<2 THEN RAISE EXCEPTION 'FACTION_MISSING'; END IF;
  res_name:=cfg->>'resource';
  have:=coalesce((cargo->>res_name)::bigint,0);
  debit:=(cfg->>'perPoint')::bigint*p_quantity;
  SELECT coalesce(sum((l.quote->>'resourceQty')::bigint),0) INTO issued
    FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.quote->>'resource'=res_name;
  SELECT coalesce(sum(t.quantity),0) INTO spent FROM public.stellar_u42_material_spends t
    WHERE t.user_id=u AND t.material=res_name;
  IF have<debit OR issued-spent<debit THEN RAISE EXCEPTION 'MATERIAL_NOT_VERIFIED: %',res_name; END IF;
  cargo:=jsonb_set(cargo,ARRAY[res_name],to_jsonb(have-debit),true);
  INSERT INTO public.stellar_u42_material_spends(user_id,request_id,material,quantity)
    VALUES(u,p_request_id,res_name,debit);
  INSERT INTO public.stellar_u42_donations(user_id,faction,project_code,quantity) VALUES(u,f,p_code,p_quantity);
  outcome:=jsonb_build_object('ok',true,'action',p_action,'project',p_code,'contribution',p_quantity);
 END IF;
 IF p_action IN ('forge','donate','expedition_start') THEN
  revision:=coalesce((s->>'serverPurchaseRevision')::bigint,0)+1;
  s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(revision),true);
  s:=jsonb_set(s,'{cargo}',cargo,true);
  s:=jsonb_set(s,'{profile}',prof,true);
  UPDATE public.game_saves SET state=s,updated_at=now() WHERE user_id=u;
 END IF;
 INSERT INTO public.stellar_u42_actions(user_id,request_id,action,result) VALUES(u,p_request_id,p_action,outcome);
 RETURN outcome;
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u42_action(text,text,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u42_action(text,text,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u42_squad(p_action text,p_invite_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE u uuid:=auth.uid(); existing uuid; q public.stellar_u42_squads%ROWTYPE;
 f text; new_owner uuid; n integer; code text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT squad_id INTO existing FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF p_action='create' THEN
  IF existing IS NOT NULL THEN RAISE EXCEPTION 'SQUAD_ALREADY_MEMBER'; END IF;
  SELECT faction INTO f FROM public.profiles WHERE id=u;
  IF f IS NULL OR length(f)<2 THEN RAISE EXCEPTION 'FACTION_MISSING'; END IF;
  code:=substr(md5(gen_random_uuid()::text),1,8);
  INSERT INTO public.stellar_u42_squads(invite_code,faction,owner_id) VALUES(code,f,u) RETURNING * INTO q;
  INSERT INTO public.stellar_u42_squad_members(user_id,squad_id) VALUES(u,q.id);
  RETURN jsonb_build_object('ok',true,'inviteCode',q.invite_code,'members',1);
 ELSIF p_action='join' THEN
  IF existing IS NOT NULL THEN RAISE EXCEPTION 'SQUAD_ALREADY_MEMBER'; END IF;
  IF p_invite_code !~ '^[a-f0-9]{8}$' THEN RAISE EXCEPTION 'INVITE_CODE_INVALID'; END IF;
  SELECT * INTO q FROM public.stellar_u42_squads WHERE invite_code=p_invite_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SQUAD_NOT_FOUND'; END IF;
  SELECT faction INTO f FROM public.profiles WHERE id=u;
  IF f IS DISTINCT FROM q.faction THEN RAISE EXCEPTION 'SQUAD_OTHER_FACTION'; END IF;
  SELECT count(*) INTO n FROM public.stellar_u42_squad_members WHERE squad_id=q.id;
  IF n>=4 THEN RAISE EXCEPTION 'SQUAD_FULL'; END IF;
  INSERT INTO public.stellar_u42_squad_members(user_id,squad_id) VALUES(u,q.id);
  RETURN jsonb_build_object('ok',true,'inviteCode',q.invite_code,'members',n+1);
 ELSIF p_action='leave' THEN
  IF existing IS NULL THEN RAISE EXCEPTION 'SQUAD_NOT_MEMBER'; END IF;
  SELECT * INTO q FROM public.stellar_u42_squads WHERE id=existing FOR UPDATE;
  DELETE FROM public.stellar_u42_squad_members WHERE user_id=u;
  SELECT user_id INTO new_owner FROM public.stellar_u42_squad_members WHERE squad_id=existing ORDER BY joined_at LIMIT 1;
  IF new_owner IS NULL THEN DELETE FROM public.stellar_u42_squads WHERE id=existing;
  ELSIF q.owner_id=u THEN UPDATE public.stellar_u42_squads SET owner_id=new_owner WHERE id=existing; END IF;
  RETURN jsonb_build_object('ok',true,'left',true);
 ELSE RAISE EXCEPTION 'SQUAD_ACTION_INVALID'; END IF;
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u42_squad(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u42_squad(text,text) TO authenticated;

-- ADM pode editar valores sem alterar códigos/recompensas estruturais.
CREATE OR REPLACE FUNCTION public.stellar_u42_admin_price(p_code text,p_cost jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE row public.stellar_u42_catalog%ROWTYPE; k text; n numeric; merged jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 SELECT * INTO row FROM public.stellar_u42_catalog WHERE code=p_code FOR UPDATE;
 IF NOT FOUND OR jsonb_typeof(p_cost)<>'object' THEN RAISE EXCEPTION 'INVALID_CONFIG'; END IF;
 merged:=row.rule;
 IF row.kind='forge' THEN
  IF p_cost ? 'cost' AND jsonb_typeof(p_cost->'cost')='object' THEN
    FOR k IN SELECT jsonb_object_keys(p_cost->'cost') LOOP
      IF k NOT IN ('Aurorium','Nexium','Eclipsium') THEN RAISE EXCEPTION 'INVALID_RESOURCE'; END IF;
      n:=(p_cost->'cost'->>k)::numeric;
      IF n<0 OR n>10000 OR n<>trunc(n) THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
    END LOOP;
    merged:=jsonb_set(merged,'{cost}',p_cost->'cost',true);
  ELSE RAISE EXCEPTION 'INVALID_FORGE_COST'; END IF;
 ELSIF row.kind='expedition' THEN
  FOR k IN SELECT jsonb_object_keys(p_cost) LOOP
    IF k NOT IN ('credits','minutes','research') THEN RAISE EXCEPTION 'INVALID_FIELD'; END IF;
    n:=(p_cost->>k)::numeric;
    IF n<1 OR n>CASE k WHEN 'credits' THEN 10000000 WHEN 'minutes' THEN 1440 ELSE 10000 END OR n<>trunc(n) THEN RAISE EXCEPTION 'INVALID_NUMBER'; END IF;
  END LOOP;
  merged:=merged||p_cost;
 ELSE
  IF NOT (p_cost ? 'perPoint') THEN RAISE EXCEPTION 'INVALID_PROJECT_COST'; END IF;
  n:=(p_cost->>'perPoint')::numeric;
  IF n<1 OR n>100 OR n<>trunc(n) THEN RAISE EXCEPTION 'INVALID_PRICE'; END IF;
  merged:=jsonb_set(merged,'{perPoint}',to_jsonb(n::integer),true);
 END IF;
 UPDATE public.stellar_u42_catalog SET rule=merged,updated_at=now() WHERE code=p_code;
 RETURN jsonb_build_object('ok',true,'code',p_code,'rule',merged);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u42_admin_price(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u42_admin_price(text,jsonb) TO authenticated;
COMMIT;
