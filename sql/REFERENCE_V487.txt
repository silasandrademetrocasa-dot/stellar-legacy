-- Stellar Legacy V48.7: equipment-aware, persistent offline combat (SQL atomic).
-- Apply before uploading the ZIP. No changes to running/settled sessions or balances.
BEGIN;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v487(
 p_user uuid,p_minutes integer,p_auto_sell boolean,p_auto_buy boolean,p_mine boolean,
 p_npc_key text,p_ammo_key text,p_combat jsonb,p_baseline_save_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; f record; n record; v_volley integer; v_shots integer; v_lasers integer;
 v_hp numeric; v_accuracy numeric; v_damage numeric; v_interval numeric;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF coalesce(p_combat->>'combat_model','') <> 'v487' THEN RAISE EXCEPTION 'FARM_COMBAT_MODEL_REQUIRED'; END IF;
 v_lasers:=(p_combat->>'laser_count')::integer;
 v_accuracy:=(p_combat->>'hit_chance')::numeric;
 v_damage:=(p_combat->>'damage_per_volley')::numeric;
 v_interval:=(p_combat->>'fire_interval_ms')::numeric;
 IF v_lasers NOT BETWEEN 1 AND 64 OR v_accuracy NOT BETWEEN 0.5 AND 1
  OR v_damage NOT BETWEEN 1 AND 2000000 OR v_interval<>420
  OR (p_combat->>'move_between_seconds')::integer NOT BETWEEN 3 AND 45
  OR (p_combat->>'cargo_capacity')::integer NOT BETWEEN 100 AND 15000 THEN
  RAISE EXCEPTION 'FARM_COMBAT_INVALID'; END IF;
 r:=public.stellar_offline_farm_start_v485(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key);
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE id=(r->>'id')::uuid FOR UPDATE;
 IF f.id IS NULL OR f.baseline_save_at IS DISTINCT FROM p_baseline_save_at THEN
  RAISE EXCEPTION 'FARM_SAVE_CHANGED_DURING_START';
 END IF;
 -- Respeitar o controle ADM congelado por sessao, sem alteracoes retroativas.
 v_damage:=greatest(1,least(2000000,round(v_damage*coalesce((f.snapshot->>'damage_percent')::numeric,100)/100)));
 SELECT name,damage INTO n FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key AND enabled=true;
 v_hp:=coalesce((f.snapshot#>>'{npc,hp}')::numeric,0)+coalesce((f.snapshot#>>'{npc,shield}')::numeric,0);
 IF v_hp<=0 THEN RAISE EXCEPTION 'FARM_NPC_INVALID'; END IF;
 v_volley:=ceil(v_hp/greatest(1,v_damage * v_accuracy * (1 + least(0.3,greatest(0,coalesce((p_combat->>'shield_pressure')::numeric,0))) * coalesce((f.snapshot#>>'{npc,shield}')::numeric,0)/v_hp)))::integer;
 IF v_volley>50000 THEN RAISE EXCEPTION 'FARM_TARGET_TOO_TOUGH'; END IF;
 v_volley:=greatest(1,v_volley);
 v_shots:=v_volley*v_lasers;
 IF v_shots>320000 THEN RAISE EXCEPTION 'FARM_TARGET_TOO_TOUGH'; END IF;
 UPDATE public.stellar_offline_farm_v484 SET snapshot= snapshot || p_combat ||
 jsonb_build_object('npc_name',n.name,'damage_per_volley',v_damage,'ammo_per_kill',v_shots,'combat_kill_seconds',
   greatest(1,least(30000,ceil(v_volley*.42)::integer + (p_combat->>'move_between_seconds')::integer)),
   'enemy_damage',coalesce(n.damage,0),'damage_per_second',round(v_damage*v_accuracy/.42,2))
 WHERE id=f.id;
 RETURN r || jsonb_build_object('npc_name',n.name,'laser_count',v_lasers,'damage_per_second',round(v_damage*v_accuracy/.42,2));
END $$;
REVOKE ALL ON FUNCTION public.stellar_offline_farm_start_v487(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v487(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v487(p_user uuid)
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
 IF f.snapshot->>'combat_model'='v487' THEN
   shots:=greatest(1,least(320000,coalesce((f.snapshot->>'ammo_per_kill')::integer,0)));
   kill_seconds:=greatest(1,least(30000,coalesce((f.snapshot->>'combat_kill_seconds')::integer,30000)));
   capacity:=greatest(100,least(15000,coalesce((f.snapshot->>'cargo_capacity')::bigint,1500)));
   trip_seconds:=greatest(45,least(600,ceil(trip_seconds*350.0/greatest(100,(f.snapshot->>'ship_speed')::numeric))::integer));
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
   WHILE ammo_qty < shots LOOP
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price OR bought>=100 THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Cada pacote exige uma viagem virtual com débito oficial de créditos.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END LOOP;
   IF ammo_qty<shots OR elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
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
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end,'npc_name',coalesce(f.snapshot->>'npc_name',(SELECT name FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key)),'combat_model',coalesce(f.snapshot->>'combat_model','v485'),'laser_count',coalesce((f.snapshot->>'laser_count')::integer,0),'ammo_per_kill',shots,'move_seconds',coalesce((f.snapshot->>'move_between_seconds')::integer,0));
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $$;
REVOKE ALL ON FUNCTION public.stellar_offline_farm_claim_v487(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_claim_v487(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_offline_farm_status_v484(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; v_name text;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 SELECT * INTO s FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1;
 IF s.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 SELECT name INTO v_name FROM public.game_npc_config_v1811 WHERE npc_key=s.npc_key LIMIT 1;
 RETURN jsonb_build_object('id',s.id,'status',s.status,'map',s.map_id,
 'npc',s.npc_key,'npc_name',coalesce(nullif(v_name,''),s.npc_key),'ammo',s.ammo_key,'minutes',s.minutes,
 'started_at',s.started_at,'ends_at',s.ends_at,'report',s.report);
END $$;
REVOKE ALL ON FUNCTION public.stellar_offline_farm_status_v484(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_status_v484(uuid) TO service_role;
COMMIT;
