-- Stellar Legacy V19.0.8 — criação de conteúdo com verificação de administrador.
-- Aplique após instalar o ZIP V19.0.8. Não altera saves nem usuários.
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_create_economy_service_v1908(p_content jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,auth,pg_temp AS $$
DECLARE v_id text:=trim(coalesce(p_content->>'service_id',''));v_name text:=trim(coalesce(p_content->>'name',''));v_effect jsonb:=coalesce(p_content->'effect','{}'::jsonb);
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF v_id !~ '^[a-zA-Z0-9_-]{1,32}$' OR length(v_name) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'ID ou nome inválidos.'; END IF;
 IF jsonb_typeof(v_effect)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(v_effect))<>1 OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_effect) AS x(k) WHERE k NOT IN ('laser_damage_pct','shield_pct','cargo_flat','speed_flat')) THEN RAISE EXCEPTION 'Efeito não permitido.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(v_effect) AS k(name,value) WHERE value !~ '^[0-9]+(\.[0-9]+)?$' OR value::numeric>10000) THEN RAISE EXCEPTION 'Valor do efeito inválido.'; END IF;
 IF EXISTS(SELECT 1 FROM public.game_economy_service_v1815 WHERE service_id=v_id) THEN RAISE EXCEPTION 'Serviço com este ID já existe.'; END IF;
 INSERT INTO public.game_economy_service_v1815(service_id,name,description,base_cost,duration_ms,level_band_size,level_cost_scale,max_stack_ms,effect,enabled,sort_order,updated_at)
 VALUES(v_id,v_name,left(coalesce(p_content->>'description',''),180),greatest(0,least(1000000000000,(p_content->>'base_cost')::bigint)),greatest(60000,least(86400000,(p_content->>'duration_ms')::integer)),5,greatest(0,least(10,(p_content->>'level_cost_scale')::numeric)),greatest(60000,least(604800000,(p_content->>'max_stack_ms')::integer)),v_effect,coalesce((p_content->>'enabled')::boolean,true),100,now());
 RETURN jsonb_build_object('ok',true,'service_id',v_id);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_create_crafting_recipe_v1908(p_content jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,auth,pg_temp AS $$
DECLARE v_id text:=trim(coalesce(p_content->>'recipe_id',''));v_name text:=trim(coalesce(p_content->>'name',''));v_i jsonb:=coalesce(p_content->'ingredients','{}'::jsonb);v_g jsonb:=coalesce(p_content->'grant_payload','{}'::jsonb);
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF v_id !~ '^[a-zA-Z0-9_-]{1,32}$' OR length(v_name) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'ID ou nome inválidos.'; END IF;
 IF jsonb_typeof(v_i)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(v_i)) NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Informe entre 1 e 12 ingredientes.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(v_i) AS t(k,v) WHERE k !~ '^[a-zA-Z0-9_-]{1,32}$' OR v !~ '^[1-9][0-9]*$' OR v::numeric>1000000) THEN RAISE EXCEPTION 'Ingrediente inválido.'; END IF;
 IF (v_g->>'kind') NOT IN ('resource','ammo','rocket','repair') OR (v_g->>'id') !~ '^[a-zA-Z0-9_-]{1,32}$' OR coalesce((v_g->>'qty')::numeric,0) NOT BETWEEN 1 AND 10000000 THEN RAISE EXCEPTION 'Produto inválido.'; END IF;
 IF EXISTS(SELECT 1 FROM public.game_crafting_recipe_v1815 WHERE recipe_id=v_id) THEN RAISE EXCEPTION 'Receita com este ID já existe.'; END IF;
 INSERT INTO public.game_crafting_recipe_v1815(recipe_id,name,description,cost,currency,ingredients,grant_payload,output_label,min_level,enabled,sort_order,updated_at)
 VALUES(v_id,v_name,left(coalesce(p_content->>'description',''),180),greatest(0,least(1000000000000,(p_content->>'cost')::bigint)),CASE WHEN p_content->>'currency'='uridium' THEN 'uridium' ELSE 'credits' END,v_i,v_g,left(coalesce(nullif(p_content->>'output_label',''),v_name),80),greatest(1,least(100,(p_content->>'min_level')::integer)),coalesce((p_content->>'enabled')::boolean,true),100,now());
 RETURN jsonb_build_object('ok',true,'recipe_id',v_id);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_create_pass_season_v1908(p_content jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,auth,pg_temp AS $$
DECLARE v_key text:=trim(coalesce(p_content->>'season_key',''));v_name text:=trim(coalesce(p_content->>'name',''));v_start timestamptz;v_end timestamptz;v_tiers integer;v_tier integer;
v_empty jsonb:='{"credits":0,"uridium":0,"ammo":{},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF v_key !~ '^[a-zA-Z0-9_-]{3,32}$' OR length(v_name) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'ID ou nome de temporada inválidos.'; END IF;
 v_start:=(p_content->>'starts_at')::timestamptz;v_end:=(p_content->>'ends_at')::timestamptz;v_tiers:=(p_content->>'tier_count')::integer;
 IF v_start IS NULL OR v_end IS NULL OR v_end<=v_start OR v_tiers NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Datas ou número de níveis inválidos.'; END IF;
 IF EXISTS(SELECT 1 FROM public.game_battle_pass_seasons_v1817b WHERE season_key=v_key) THEN RAISE EXCEPTION 'Esta temporada já existe.'; END IF;
 INSERT INTO public.game_battle_pass_seasons_v1817b(season_key,name,description,starts_at,ends_at,tier_count,points_per_tier,daily_points,premium_price_brl,enabled,updated_at)
 VALUES(v_key,v_name,left(coalesce(p_content->>'description',''),240),v_start,v_end,v_tiers,greatest(1,least(1000000,(p_content->>'points_per_tier')::integer)),greatest(1,least(100000,(p_content->>'daily_points')::integer)),greatest(0,least(99999,(p_content->>'premium_price_brl')::numeric)),false,now());
 FOR v_tier IN 1..v_tiers LOOP
   INSERT INTO public.game_battle_pass_tiers_v1817b(season_key,tier_no,free_reward,premium_reward,enabled,updated_at)
   VALUES(v_key,v_tier,v_empty,v_empty,false,now());
 END LOOP;
 RETURN jsonb_build_object('ok',true,'season_key',v_key,'tier_count',v_tiers,'enabled',false);
END;$$;

REVOKE ALL ON FUNCTION public.admin_create_economy_service_v1908(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_create_crafting_recipe_v1908(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_create_pass_season_v1908(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_create_economy_service_v1908(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_crafting_recipe_v1908(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_pass_season_v1908(jsonb) TO authenticated;

-- Controle de preços auditável, único por servidor.
CREATE TABLE IF NOT EXISTS public.game_auction_rules_v1908(
 id integer PRIMARY KEY CHECK(id=1),
 nova_floor bigint NOT NULL DEFAULT 100000000 CHECK (nova_floor BETWEEN 100000000 AND 1000000000 AND nova_floor % 100000=0),
 common_floor bigint NOT NULL DEFAULT 100000 CHECK (common_floor BETWEEN 100000 AND 10000000 AND common_floor % 100000=0),
 version bigint NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.game_auction_rules_v1908(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.game_auction_rules_v1908 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_auction_rules_v1908 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_auction_rules_v1908()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,auth,pg_temp AS $$
DECLARE r public.game_auction_rules_v1908%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 SELECT * INTO r FROM public.game_auction_rules_v1908 WHERE id=1;
 RETURN jsonb_build_object('nova_floor',r.nova_floor,'common_floor',r.common_floor,'version',r.version);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_update_auction_rules_v1908(p_nova_floor bigint,p_common_floor bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,auth,pg_temp AS $$
DECLARE r public.game_auction_rules_v1908%rowtype;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_nova_floor NOT BETWEEN 100000000 AND 1000000000 OR p_nova_floor % 100000<>0 OR p_common_floor NOT BETWEEN 100000 AND 10000000 OR p_common_floor % 100000<>0 THEN RAISE EXCEPTION 'Valores de leilão inválidos.'; END IF;
 UPDATE public.game_auction_rules_v1908 SET nova_floor=p_nova_floor,common_floor=p_common_floor,version=version+1,updated_at=now() WHERE id=1 RETURNING * INTO r;
 RETURN jsonb_build_object('nova_floor',r.nova_floor,'common_floor',r.common_floor,'version',r.version);
END;$$;

REVOKE ALL ON FUNCTION public.get_auction_rules_v1908() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_update_auction_rules_v1908(bigint,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_auction_rules_v1908() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_auction_rules_v1908(bigint,bigint) TO authenticated;

-- Preserva a implementação V18.2.12 de liquidação, adicionando somente pisos do ADM.
CREATE OR REPLACE FUNCTION public.place_auction_bid_online(p_hour_key text,p_lot_ref text,p_user_bid bigint,p_lot jsonb)
RETURNS TABLE(lot_ref text,user_bid bigint,leader_user_id uuid,leader_callsign text,lot jsonb,updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
#variable_conflict use_column
declare
 v_uid uuid:=auth.uid();
 v_current public.auction_bids%rowtype;
 v_credits bigint:=0;
 v_reserved bigint:=0;
 v_nova_floor bigint:=100000000;
 v_common_floor bigint:=100000;
 v_floor bigint:=case when p_lot_ref='item:iris' then 100000000 else greatest(100000,coalesce((p_lot->>'systemFloor')::bigint,100000)) end;
begin
 if v_uid is null then raise exception 'Sessão ausente.';end if;
 select r.nova_floor,r.common_floor into v_nova_floor,v_common_floor from public.game_auction_rules_v1908 r where r.id=1;
 v_floor:=case when p_lot_ref='item:iris' then greatest(100000000,coalesce(v_nova_floor,100000000)) else greatest(v_floor,coalesce(v_common_floor,100000)) end;
 if p_user_bid<100000 or mod(p_user_bid,100000)<>0 then raise exception 'O lance deve usar passos de 100.000 CR.';end if;
 perform pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 select * into v_current from public.auction_bids where hour_key=p_hour_key and lot_ref=p_lot_ref and status='active' order by user_bid desc,updated_at asc limit 1 for update;
 if found and v_current.user_id=v_uid then raise exception 'Você já está liderando este lote.';end if;
 if found then
  if p_user_bid<greatest(v_current.user_bid+100000,v_floor) then raise exception 'Seu lance precisa superar o jogador atual em pelo menos 100.000 CR.';end if;
 elsif p_user_bid<v_floor then raise exception 'O lance está abaixo do preço atual do sistema.';end if;
 select coalesce(credits,0) into v_credits from public.profiles where id=v_uid for update;
 select coalesce(sum(user_bid),0) into v_reserved from public.auction_bids where user_id=v_uid and hour_key=p_hour_key and status='active' and lot_ref<>p_lot_ref;
 if v_credits<v_reserved+p_user_bid then raise exception 'Créditos insuficientes considerando os seus lances em garantia.';end if;
 update public.auction_bids set status='lost',updated_at=now() where hour_key=p_hour_key and lot_ref=p_lot_ref and status='active';
 insert into public.auction_bids(user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at)
 values(v_uid,p_hour_key,p_lot_ref,p_user_bid,coalesce(p_lot,'{}'::jsonb),'active',now(),now())
 on conflict(user_id,hour_key,lot_ref) do update set user_bid=excluded.user_bid,lot=excluded.lot,status='active',updated_at=now();
 return query select b.lot_ref,b.user_bid,b.user_id,coalesce(p.callsign,'Pilot'),b.lot,b.updated_at
 from public.auction_bids b left join public.profiles p on p.id=b.user_id
 where b.user_id=v_uid and b.hour_key=p_hour_key and b.lot_ref=p_lot_ref and b.status='active' limit 1;
end;
$function$;

COMMIT;
