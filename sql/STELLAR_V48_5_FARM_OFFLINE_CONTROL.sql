-- V48.5 — Controle ADM e projeção visual. Não modifica sessões históricas.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_offline_farm_settings_v485 (
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
 max_minutes integer NOT NULL DEFAULT 240 CHECK(max_minutes BETWEEN 30 AND 720 AND max_minutes % 30=0),
 damage_percent integer NOT NULL DEFAULT 100 CHECK(damage_percent BETWEEN 50 AND 150),
 max_kills integer NOT NULL DEFAULT 550 CHECK(max_kills BETWEEN 20 AND 2000),
 travel_seconds integer NOT NULL DEFAULT 125 CHECK(travel_seconds BETWEEN 45 AND 600),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_offline_farm_settings_v485(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.stellar_offline_farm_settings_v485 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stellar_offline_farm_settings_v485 FROM PUBLIC,anon,authenticated;
GRANT SELECT, UPDATE ON TABLE public.stellar_offline_farm_settings_v485 TO service_role;
GRANT SELECT ON TABLE public.game_map_npc_spawns_v1811 TO service_role;
GRANT SELECT ON TABLE public.game_npc_config_v1811 TO service_role;
GRANT SELECT ON TABLE public.live_shop_prices_v16 TO service_role;
GRANT SELECT ON TABLE public.game_resource_config_v1814 TO service_role;
GRANT SELECT ON TABLE public.game_map_resource_pool_v1814 TO service_role;
ALTER TABLE public.stellar_offline_farm_v484 DROP CONSTRAINT IF EXISTS stellar_offline_farm_v484_minutes_check;
ALTER TABLE public.stellar_offline_farm_v484 ADD CONSTRAINT stellar_offline_farm_v484_minutes_check CHECK(minutes BETWEEN 30 AND 720 AND minutes % 30=0);

CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v485(p_user uuid,p_minutes integer,p_auto_sell boolean DEFAULT true,p_auto_buy boolean DEFAULT true,p_mine boolean DEFAULT true,p_npc_key text DEFAULT NULL,p_ammo_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s record; c record; q record; cfg record; v_npc record; v_map text; v_ammo text; v_id uuid; v_level integer; v_factor numeric; v_damage numeric;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 SELECT max_minutes,damage_percent,max_kills,travel_seconds INTO STRICT cfg FROM public.stellar_offline_farm_settings_v485 WHERE id=1;
 IF p_minutes < 30 OR p_minutes > cfg.max_minutes OR p_minutes % 30 <> 0 THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=p_user AND status='running') THEN RAISE EXCEPTION 'FARM_ALREADY_RUNNING'; END IF;
 SELECT state,updated_at INTO s FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO c FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF c.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_PROFILE_MISSING'; END IF;
 IF s.state IS NULL OR s.state->'profile' IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 v_map:=s.state->>'mapId'; v_ammo:=coalesce(nullif(p_ammo_key,''),nullif(s.state->>'selectedLaserAmmo',''),'lcb10');
 IF v_ammo NOT IN ('lcb10','mcb25','mcb50','ucb100') THEN RAISE EXCEPTION 'INVALID_AMMO'; END IF;
 v_level:=greatest(1,least(50,coalesce((s.state#>>'{profile,level}')::integer,1)));
 IF v_map !~ '^x[1-8]$' OR coalesce(s.state->>'repairRequired','false') NOT IN ('false','null') THEN RAISE EXCEPTION 'FARM_MAP_OR_REPAIR_UNSUPPORTED'; END IF;
 IF v_level < (CASE v_map WHEN 'x1' THEN 1 WHEN 'x2' THEN 3 WHEN 'x3' THEN 5 WHEN 'x4' THEN 7 WHEN 'x5' THEN 9 WHEN 'x6' THEN 12 WHEN 'x7' THEN 15 WHEN 'x8' THEN 18 ELSE 99 END)
 THEN RAISE EXCEPTION 'FARM_LEVEL_INSUFFICIENT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_autopilot_access_v48 a WHERE a.user_id=p_user AND a.enabled=true AND (a.expires_at IS NULL OR a.expires_at>now()))
   AND NOT EXISTS(SELECT 1 FROM public.game_admins WHERE user_id=p_user) THEN
   RAISE EXCEPTION 'FARM_ACCESS_REQUIRED';
 END IF;
 SELECT n.npc_key,n.hp,n.shield,n.credits,n.stl,n.xp,n.resources INTO v_npc
 FROM public.game_map_npc_spawns_v1811 m
 JOIN public.game_npc_config_v1811 n ON n.npc_key=m.npc_key
 WHERE m.map_id=v_map AND m.enabled=true AND n.enabled=true AND n.npc_key !~* '(boss|rift|elite|suprem|legend|lend|uber|ultra|titan)' AND n.name !~* '(boss|suprem|legend|lend|elite|uber|ultra)' AND coalesce(m.spawn_count,0)>0 AND (p_npc_key IS NULL OR n.npc_key=p_npc_key)
 ORDER BY n.hp+n.shield ASC,n.npc_key ASC LIMIT 1;
 IF v_npc.npc_key IS NULL THEN RAISE EXCEPTION 'FARM_NO_ELIGIBLE_NPCS'; END IF;
 -- Munição apenas de crédito; STL/premium é consumido se houver estoque, nunca comprado aqui.
 SELECT catalog_key,price,currency,(meta#>>'{grant,qty}')::integer AS qty INTO q FROM public.live_shop_prices_v16
 WHERE kind='ammo' AND ref_id=v_ammo AND enabled=true AND shop_visible=true LIMIT 1;
 IF q.catalog_key IS NULL THEN RAISE EXCEPTION 'FARM_AMMO_UNAVAILABLE'; END IF;
 v_factor:= CASE v_ammo WHEN 'lcb10' THEN 1 WHEN 'mcb25' THEN 2 WHEN 'mcb50' THEN 3 WHEN 'ucb100' THEN 4 ELSE 1 END;
 v_damage:=greatest(1,(175+v_level*80)*v_factor*cfg.damage_percent/100.0);
 INSERT INTO public.stellar_offline_farm_v484(user_id,map_id,npc_key,ammo_key,minutes,auto_sell,auto_buy,mine,snapshot,baseline_save_at,ends_at)
 VALUES(p_user,v_map,v_npc.npc_key,v_ammo,p_minutes,coalesce(p_auto_sell,true),coalesce(p_auto_buy,true),coalesce(p_mine,true),
 jsonb_build_object('npc',to_jsonb(v_npc),'level',v_level,'damage_per_shot',v_damage,'damage_per_second',round(v_damage/7,2),'max_kills',cfg.max_kills,'trip_seconds',cfg.travel_seconds,'damage_percent',cfg.damage_percent,'profile_updated_at',c.updated_at,'shop',CASE WHEN q.catalog_key IS NOT NULL THEN to_jsonb(q) ELSE '{}'::jsonb END),s.updated_at,now()+make_interval(mins=>p_minutes))
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'id',v_id,'status','running','map',v_map,'npc',v_npc.npc_key,'minutes',p_minutes,'ammo',v_ammo,'damage_per_second',round(v_damage/7,2),'ends_at',(SELECT ends_at FROM public.stellar_offline_farm_v484 WHERE id=v_id));
END $$;


CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v484(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE f record; sv record; p record; npc jsonb; shop jsonb;
 v_end timestamptz; target_seconds integer; elapsed integer:=0; kill_seconds integer; trip_seconds integer:=125; shots integer;
 k integer:=0; sold_count integer:=0; bought integer:=0; mined integer:=0; earned_cr bigint:=0; earned_stl bigint:=0; earned_xp bigint:=0; sale_cr bigint:=0; purchase_cr bigint:=0;
 cr bigint; stl bigint; xp bigint; ammo_key text; ammo_qty bigint; ammo_pack_qty integer; ammo_pack_price bigint; cargo jsonb; v_cargo_used bigint:=0; capacity bigint:=1500;
 res record; q integer; n integer; v_price bigint; v_resource text; mine_resource text; got_resources jsonb:='{}'::jsonb; sold_resources jsonb:='{}'::jsonb;
 st jsonb; v_report jsonb; reason text:='duration'; has_other_activity boolean; max_kills integer:=550;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF f.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status<>'running' THEN RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report); END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 -- Um save ou recompensa real no período invalida a simulação: jamais misturar farm vivo e offline.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
  OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at) INTO has_other_activity;
 IF (sv.updated_at IS DISTINCT FROM f.baseline_save_at) OR (p.updated_at IS DISTINCT FROM (f.snapshot->>'profile_updated_at')::timestamptz) OR has_other_activity THEN
   v_report:=jsonb_build_object('reason','online_activity_or_save_changed','kills',0,'message','Farm offline cancelado: houve atividade online ou alteração do save após ativação. Nenhuma recompensa offline foi gerada.');
   UPDATE public.stellar_offline_farm_v484 SET status='conflict',completed_at=now(),report=v_report WHERE id=f.id;
   RETURN jsonb_build_object('ok',false,'status','conflict','report',v_report);
 END IF;
 v_end:=least(now(),f.ends_at);
 target_seconds:=greatest(0,floor(extract(epoch from v_end-f.started_at))::integer);
 npc:=f.snapshot->'npc'; shop:=f.snapshot->'shop'; ammo_key:=f.ammo_key;
 kill_seconds:=greatest(35,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(150+coalesce((f.snapshot->>'level')::numeric,1)*60))*7)::integer);
 shots:=greatest(8,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(175+coalesce((f.snapshot->>'level')::numeric,1)*80))::integer));
 IF f.snapshot ? 'damage_per_shot' THEN
   kill_seconds:=greatest(25,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric)*7)::integer));
   shots:=greatest(1,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric))::integer));
   trip_seconds:=greatest(45,least(600,coalesce((f.snapshot->>'trip_seconds')::integer,125)));
   max_kills:=greatest(20,least(2000,coalesce((f.snapshot->>'max_kills')::integer,550)));
 END IF;
 ammo_qty:=greatest(0,coalesce((sv.state->'ammo'->>ammo_key)::bigint,0));
 ammo_pack_qty:=greatest(0,least(100000,coalesce((shop->>'qty')::integer,0)));
 ammo_pack_price:=greatest(0,coalesce((shop->>'price')::bigint,0));
 cr:=greatest(0,coalesce((sv.state#>>'{profile,credits}')::bigint,0));
 stl:=greatest(0,coalesce((sv.state#>>'{profile,uridium}')::bigint,0));
 xp:=greatest(0,coalesce((sv.state#>>'{profile,xp}')::bigint,0));
 cargo:=coalesce(sv.state->'cargo','{}'::jsonb);
 SELECT resource_key INTO mine_resource FROM public.game_map_resource_pool_v1814 WHERE map_id=f.map_id AND enabled=true AND resource_key<>'Xenomit' ORDER BY resource_key LIMIT 1;
 SELECT coalesce(sum(greatest(0,least(100000000, CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END))),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
 WHILE elapsed+kill_seconds<=target_seconds AND k<max_kills LOOP
   IF ammo_qty < shots THEN
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Mesmo estoque oficial e preço do snapshot salvo. Sem compra de STL.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END IF;
   IF elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
   ammo_qty:=ammo_qty-shots; elapsed:=elapsed+kill_seconds; k:=k+1;
   earned_cr:=earned_cr+greatest(0,coalesce((npc->>'credits')::bigint,0));
   earned_stl:=earned_stl+greatest(0,coalesce((npc->>'stl')::bigint,0));
   earned_xp:=earned_xp+greatest(0,coalesce((npc->>'xp')::bigint,0));
   FOR res IN SELECT key,value FROM jsonb_each_text(coalesce(npc->'resources','{}'::jsonb)) LOOP
     IF v_cargo_used >= capacity THEN EXIT; END IF;
     n:=least(capacity-v_cargo_used, greatest(0,least(1000, CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END)));
     IF n>0 THEN
       cargo:=jsonb_set(cargo,ARRAY[res.key],to_jsonb(coalesce((cargo->>res.key)::bigint,0)+n),true);
       got_resources:=jsonb_set(got_resources,ARRAY[res.key],to_jsonb(coalesce((got_resources->>res.key)::bigint,0)+n),true);
       v_cargo_used:=v_cargo_used+n;
     END IF;
   END LOOP;
   IF f.mine AND mine_resource IS NOT NULL AND k%5=0 AND v_cargo_used<capacity THEN
     n:=least(10,capacity-v_cargo_used);
     cargo:=jsonb_set(cargo,ARRAY[mine_resource],to_jsonb(coalesce((cargo->>mine_resource)::bigint,0)+n),true);
     got_resources:=jsonb_set(got_resources,ARRAY[mine_resource],to_jsonb(coalesce((got_resources->>mine_resource)::bigint,0)+n),true);
     v_cargo_used:=v_cargo_used+n;mined:=mined+n;
   END IF;
   IF v_cargo_used>=capacity THEN
     IF NOT f.auto_sell THEN reason:='cargo_full';EXIT; END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='cargo_waiting_sale';EXIT;END IF;
     elapsed:=elapsed+trip_seconds;sold_count:=sold_count+1;
     FOR res IN SELECT key,value FROM jsonb_each_text(cargo) LOOP
       q:=greatest(0,least(100000000,CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END));
       IF res.key='Xenomit' OR q=0 THEN CONTINUE;END IF;
       SELECT greatest(0,sell_price) INTO v_price FROM public.game_resource_config_v1814 WHERE resource_key=res.key AND enabled=true LIMIT 1;
       IF v_price IS NULL THEN CONTINUE;END IF;
       sale_cr:=sale_cr+q*v_price;
       sold_resources:=jsonb_set(sold_resources,ARRAY[res.key],to_jsonb(coalesce((sold_resources->>res.key)::bigint,0)+q),true);
       cargo:=jsonb_set(cargo,ARRAY[res.key],'0'::jsonb,true);
     END LOOP;
     SELECT coalesce(sum(greatest(0,CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END)),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
   END IF;
 END LOOP;
 IF elapsed=0 AND target_seconds<kill_seconds THEN reason:='waiting'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr<0 THEN RAISE EXCEPTION 'FARM_CREDITS_UNDERFLOW'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr>1000000000000 OR stl+earned_stl>10000000000 THEN RAISE EXCEPTION 'FARM_ECONOMY_LIMIT'; END IF;
 st:=sv.state;
 st:=jsonb_set(st,ARRAY['profile','credits'],to_jsonb(cr+earned_cr+sale_cr-purchase_cr),true);
 st:=jsonb_set(st,ARRAY['profile','uridium'],to_jsonb(stl+earned_stl),true);
 st:=jsonb_set(st,ARRAY['profile','xp'],to_jsonb(xp+earned_xp),true);
 st:=jsonb_set(st,ARRAY['profile','aliensKilled'],to_jsonb(coalesce((st#>>'{profile,aliensKilled}')::bigint,0)+k),true);
 st:=jsonb_set(st,ARRAY['ammo',ammo_key],to_jsonb(ammo_qty),true);
 st:=jsonb_set(st,ARRAY['cargo'],cargo,true);
 IF k>0 THEN st:=jsonb_set(st,ARRAY['serverNpcRewardRevision'],to_jsonb(coalesce((st->>'serverNpcRewardRevision')::integer,0)+1),true); END IF;
 IF mined>0 THEN st:=jsonb_set(st,ARRAY['serverOreRevision'],to_jsonb(coalesce((st->>'serverOreRevision')::integer,0)+1),true); END IF;
 IF purchase_cr>0 OR sale_cr>0 THEN st:=jsonb_set(st,ARRAY['serverPurchaseRevision'],to_jsonb(coalesce((st->>'serverPurchaseRevision')::integer,0)+1),true); END IF;
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end);
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $$;


REVOKE ALL ON FUNCTION public.stellar_offline_farm_start_v485(uuid,integer,boolean,boolean,boolean,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v485(uuid,integer,boolean,boolean,boolean,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.stellar_offline_farm_claim_v484(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_claim_v484(uuid) TO service_role;
COMMIT;
