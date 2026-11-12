-- V144.1: catalog purchases use the existing purchase transaction and receipts.
CREATE OR REPLACE FUNCTION public.stellar_formation_purchase_valid_v1441(p_old jsonb,p_new jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path='' AS $f$
DECLARE before_owned jsonb:=coalesce(p_old->'ownedDroneFormationsV144','[]'::jsonb);after_owned jsonb:=p_new->'ownedDroneFormationsV144';
 intent jsonb:=p_new->'serverFormationPurchaseV1441';product record;formation text;paid numeric;
BEGIN
 IF jsonb_typeof(before_owned) IS DISTINCT FROM 'array' OR jsonb_typeof(after_owned) IS DISTINCT FROM 'array' OR jsonb_typeof(intent) IS DISTINCT FROM 'object' THEN RETURN false;END IF;
 formation:=intent->>'id';
 IF coalesce(intent->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR intent IS NOT DISTINCT FROM p_old->'serverFormationPurchaseV1441' THEN RETURN false;END IF;
 IF jsonb_array_length(after_owned)<>jsonb_array_length(before_owned)+1 OR (after_owned - (jsonb_array_length(after_owned)-1)) IS DISTINCT FROM before_owned OR after_owned->>(jsonb_array_length(after_owned)-1) IS DISTINCT FROM formation OR before_owned ? formation THEN RETURN false;END IF;
 SELECT * INTO product FROM public.live_shop_prices_v16 WHERE catalog_key='formation:'||formation AND kind='drone_formation' AND ref_id=formation AND enabled AND shop_visible;
 IF NOT FOUND OR product.price<=0 OR product.meta#>>'{grant,kind}' IS DISTINCT FROM 'drone_formation' OR product.meta#>>'{grant,id}' IS DISTINCT FROM formation OR public.stellar_formation_modifiers_v144(formation) IS NULL OR formation='original' THEN RETURN false;END IF;
 IF product.currency IS DISTINCT FROM (CASE WHEN formation IN ('furia','interceptor','bastiao','colosso') THEN 'credits' ELSE 'uridium' END) THEN RETURN false;END IF;
 paid:=coalesce((p_old#>>ARRAY['profile',product.currency])::numeric,0)-coalesce((p_new#>>ARRAY['profile',product.currency])::numeric,0);
 RETURN paid=product.price AND coalesce((p_old#>>ARRAY['profile',product.currency])::numeric,0)>=product.price AND (p_old#>ARRAY['profile',CASE WHEN product.currency='credits' THEN 'uridium' ELSE 'credits' END]) IS NOT DISTINCT FROM (p_new#>ARRAY['profile',CASE WHEN product.currency='credits' THEN 'uridium' ELSE 'credits' END]);
END;$f$;
REVOKE ALL ON FUNCTION public.stellar_formation_purchase_valid_v1441(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_formation_purchase_valid_v1441(jsonb,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_combat_tactics_guard_v144() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $guard$
DECLARE old_state jsonb := CASE WHEN TG_OP='UPDATE' THEN OLD.state ELSE '{}'::jsonb END;
 hud jsonb;p jsonb;slot jsonb;conf text;id text;owned jsonb;old_id text;new_id text;old_mod jsonb;new_mod jsonb;
BEGIN
 IF NEW.state IS NULL THEN RETURN NEW;END IF;
 -- UPSERT runs BEFORE INSERT and BEFORE UPDATE. Only validate the UPDATE arm once.
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.game_saves s WHERE s.user_id=NEW.user_id) THEN RETURN NEW;END IF;
 IF NOT(NEW.state ? 'serverFormationPurchaseV1441') AND old_state ? 'serverFormationPurchaseV1441' THEN NEW.state:=jsonb_set(NEW.state,'{serverFormationPurchaseV1441}',old_state->'serverFormationPurchaseV1441');END IF;
 IF NEW.state->'serverFormationPurchaseV1441' IS DISTINCT FROM old_state->'serverFormationPurchaseV1441' THEN
  IF coalesce(current_setting('stellar.writer',true),'')<>'player:purchase' OR NOT public.stellar_formation_purchase_valid_v1441(old_state,NEW.state) THEN RAISE EXCEPTION 'FORMATION_PURCHASE_INVALID';END IF;
 END IF;
 owned:=coalesce(old_state->'ownedDroneFormationsV144','[]'::jsonb);
 -- Only trusted SQL administration may alter ownership; no new shop/acquisition path.
 IF coalesce(current_setting('stellar.formations_admin',true),'')<>'on' THEN
  IF NEW.state ? 'ownedDroneFormationsV144' AND NEW.state->'ownedDroneFormationsV144' IS DISTINCT FROM owned THEN
   IF coalesce(current_setting('stellar.writer',true),'')<>'player:purchase' OR NOT public.stellar_formation_purchase_valid_v1441(old_state,NEW.state) THEN RAISE EXCEPTION 'FORMATION_OWNERSHIP_RESERVED';END IF;
   owned:=NEW.state->'ownedDroneFormationsV144';
  END IF;
  IF old_state ? 'ownedDroneFormationsV144' THEN NEW.state:=jsonb_set(NEW.state,'{ownedDroneFormationsV144}',owned);END IF;
 ELSE owned:=coalesce(NEW.state->'ownedDroneFormationsV144','[]'::jsonb);END IF;
 IF jsonb_typeof(owned)<>'array' THEN RAISE EXCEPTION 'FORMATION_OWNERSHIP_INVALID';END IF;
 FOR id IN SELECT jsonb_array_elements_text(owned) LOOP IF public.stellar_formation_modifiers_v144(id) IS NULL THEN RAISE EXCEPTION 'FORMATION_ID_INVALID';END IF;END LOOP;
 -- Old clients/writers cannot erase new settings; preserve the authoritative field.
 IF NOT(NEW.state ? 'combatHudV144') AND old_state ? 'combatHudV144' THEN NEW.state:=jsonb_set(NEW.state,'{combatHudV144}',old_state->'combatHudV144');END IF;
 hud:=NEW.state->'combatHudV144';IF hud IS NULL THEN RETURN NEW;END IF;
 -- Keep slots 13-18 when a V144 client writes its original twelve slots.
 FOR conf IN SELECT unnest(ARRAY['1','2']) LOOP
  IF jsonb_typeof(hud#>ARRAY['profiles',conf,'slots'])='array' AND jsonb_array_length(hud#>ARRAY['profiles',conf,'slots'])=12 AND jsonb_typeof(old_state#>ARRAY['combatHudV144','profiles',conf,'slots'])='array' AND jsonb_array_length(old_state#>ARRAY['combatHudV144','profiles',conf,'slots'])=18 THEN
   hud:=jsonb_set(hud,ARRAY['profiles',conf,'slots'],(hud#>ARRAY['profiles',conf,'slots'])||(SELECT jsonb_agg(value ORDER BY ord) FROM jsonb_array_elements(old_state#>ARRAY['combatHudV144','profiles',conf,'slots']) WITH ORDINALITY a(value,ord) WHERE ord>12));
  END IF;
 END LOOP;
 NEW.state:=jsonb_set(NEW.state,'{combatHudV144}',hud);
 IF hud IS NOT DISTINCT FROM (old_state->'combatHudV144') AND owned IS NOT DISTINCT FROM coalesce(old_state->'ownedDroneFormationsV144','[]'::jsonb) THEN RETURN NEW;END IF;
 IF jsonb_typeof(hud)<>'object' OR hud->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(hud->'profiles')<>'object' OR NOT(hud->'profiles' ?& ARRAY['1','2']) THEN RAISE EXCEPTION 'COMBAT_HUD_INVALID';END IF;
 FOR conf IN SELECT unnest(ARRAY['1','2']) LOOP
  p:=hud#>ARRAY['profiles',conf];id:=p->>'formation';
  IF id IS NULL OR public.stellar_formation_modifiers_v144(id) IS NULL OR (id<>'original' AND NOT(owned ? id)) THEN RAISE EXCEPTION 'FORMATION_NOT_OWNED';END IF;
  IF NOT COALESCE('["lcb10","mcb25","mcb50","ucb100","sab50"]'::jsonb ? (p->>'laser'),false) OR NOT COALESCE('["r310","plt2026","plt2021","plt3030"]'::jsonb ? (p->>'rocket'),false) THEN RAISE EXCEPTION 'COMBAT_AMMO_INVALID';END IF;
  IF jsonb_typeof(p->'slots') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'slots') NOT IN (12,18) THEN RAISE EXCEPTION 'COMBAT_SLOTS_INVALID';END IF;
  FOR slot IN SELECT jsonb_array_elements(p->'slots') LOOP
   IF slot='null'::jsonb THEN CONTINUE;END IF;
   IF jsonb_typeof(slot)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(slot))<>2 THEN RAISE EXCEPTION 'COMBAT_SLOT_INVALID';END IF;
   id:=slot->>'id';
   IF slot->>'kind'='formation' THEN
    IF id IS NULL OR public.stellar_formation_modifiers_v144(id) IS NULL OR (id<>'original' AND NOT(owned ? id)) THEN RAISE EXCEPTION 'FORMATION_NOT_OWNED';END IF;
   ELSIF slot->>'kind'='laser' THEN IF NOT COALESCE('["lcb10","mcb25","mcb50","ucb100","sab50"]'::jsonb ? id,false) THEN RAISE EXCEPTION 'COMBAT_SLOT_INVALID';END IF;
   ELSIF slot->>'kind'='rocket' THEN IF NOT COALESCE('["r310","plt2026","plt2021","plt3030"]'::jsonb ? id,false) THEN RAISE EXCEPTION 'COMBAT_SLOT_INVALID';END IF;
   ELSE RAISE EXCEPTION 'COMBAT_SLOT_INVALID';END IF;
  END LOOP;
 END LOOP;
 conf:=CASE WHEN NEW.state#>>'{combatConfigsV2013,active}'='2' THEN '2' ELSE '1' END;
 -- Formation-only changes preserve the resource ratio, including damage during an in-flight save.
 IF conf=(CASE WHEN old_state#>>'{combatConfigsV2013,active}'='2' THEN '2' ELSE '1' END) THEN
  old_id:=coalesce(old_state#>>ARRAY['combatHudV144','profiles',conf,'formation'],'original');new_id:=hud#>>ARRAY['profiles',conf,'formation'];
  IF old_id IS DISTINCT FROM new_id THEN
   old_mod:=public.stellar_formation_modifiers_v144(old_id);new_mod:=public.stellar_formation_modifiers_v144(new_id);
   IF NEW.state ? 'hp' THEN NEW.state:=jsonb_set(NEW.state,'{hp}',to_jsonb(floor(least(coalesce((NEW.state->>'hp')::numeric,0),coalesce((old_state->>'hp')::numeric,0))*(100+(new_mod->>'hp')::numeric)/(100+(old_mod->>'hp')::numeric))));END IF;
   IF NEW.state ? 'shield' THEN NEW.state:=jsonb_set(NEW.state,'{shield}',to_jsonb(floor(least(coalesce((NEW.state->>'shield')::numeric,0),coalesce((old_state->>'shield')::numeric,0))*(100+(new_mod->>'shield')::numeric)/(100+(old_mod->>'shield')::numeric))));END IF;
  END IF;
 END IF;
 RETURN NEW;
END;$guard$;
DROP TRIGGER IF EXISTS zz_stellar_combat_tactics_v144 ON public.game_saves;
CREATE TRIGGER zz_stellar_combat_tactics_v144 BEFORE INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_combat_tactics_guard_v144();
REVOKE ALL ON FUNCTION public.stellar_combat_tactics_guard_v144() FROM PUBLIC,anon,authenticated;

INSERT INTO public.live_shop_prices_v16(catalog_key,kind,ref_id,price,currency,enabled,meta,display_name,description,shop_tab,shop_visible,min_level,sort_order) VALUES
('formation:furia','drone_formation','furia',500000000,'credits',true,'{"grant": {"kind": "drone_formation", "id": "furia"}, "rarity": "common"}'::jsonb,'Fúria','Formação permanente para CONF1 e CONF2.','drones',true,1,100),
('formation:interceptor','drone_formation','interceptor',650000000,'credits',true,'{"grant": {"kind": "drone_formation", "id": "interceptor"}, "rarity": "common"}'::jsonb,'Interceptor','Formação permanente para CONF1 e CONF2.','drones',true,1,110),
('formation:bastiao','drone_formation','bastiao',1200000000,'credits',true,'{"grant": {"kind": "drone_formation", "id": "bastiao"}, "rarity": "rare"}'::jsonb,'Bastião','Formação permanente para CONF1 e CONF2.','drones',true,1,120),
('formation:colosso','drone_formation','colosso',1500000000,'credits',true,'{"grant": {"kind": "drone_formation", "id": "colosso"}, "rarity": "rare"}'::jsonb,'Colosso','Formação permanente para CONF1 e CONF2.','drones',true,1,130),
('formation:vanguarda','drone_formation','vanguarda',1500000,'uridium',true,'{"grant": {"kind": "drone_formation", "id": "vanguarda"}, "rarity": "epic"}'::jsonb,'Vanguarda','Formação permanente para CONF1 e CONF2.','drones',true,1,140),
('formation:prisma','drone_formation','prisma',2000000,'uridium',true,'{"grant": {"kind": "drone_formation", "id": "prisma"}, "rarity": "epic"}'::jsonb,'Prisma','Formação permanente para CONF1 e CONF2.','drones',true,1,150),
('formation:cacador_supremo','drone_formation','cacador_supremo',4000000,'uridium',true,'{"grant": {"kind": "drone_formation", "id": "cacador_supremo"}, "rarity": "legendary"}'::jsonb,'Caçador Supremo','Formação permanente para CONF1 e CONF2.','drones',true,1,160),
('formation:leviata','drone_formation','leviata',5000000,'uridium',true,'{"grant": {"kind": "drone_formation", "id": "leviata"}, "rarity": "legendary"}'::jsonb,'Leviatã','Formação permanente para CONF1 e CONF2.','drones',true,1,170)
ON CONFLICT(catalog_key) DO UPDATE SET kind=excluded.kind,ref_id=excluded.ref_id,price=excluded.price,currency=excluded.currency,enabled=excluded.enabled,meta=excluded.meta,display_name=excluded.display_name,description=excluded.description,shop_tab=excluded.shop_tab,shop_visible=excluded.shop_visible,min_level=excluded.min_level,sort_order=excluded.sort_order,updated_at=now();
