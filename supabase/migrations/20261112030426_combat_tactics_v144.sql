-- V144: extends the same game_saves JSON and checkpoint transaction. No second state table.
CREATE OR REPLACE FUNCTION public.stellar_formation_modifiers_v144(p_id text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $catalog$
 SELECT '{"original":{"damage":0,"hp":0,"shield":0,"speed":0},"furia":{"damage":18,"hp":-10,"shield":-8,"speed":0},"interceptor":{"damage":-10,"hp":0,"shield":-8,"speed":18},"bastiao":{"damage":-6,"hp":0,"shield":22,"speed":-12},"colosso":{"damage":-12,"hp":22,"shield":0,"speed":-6},"vanguarda":{"damage":14,"hp":-10,"shield":-8,"speed":14},"prisma":{"damage":14,"hp":-6,"shield":14,"speed":-10},"cacador_supremo":{"damage":16,"hp":-6,"shield":-12,"speed":18},"leviata":{"damage":-6,"hp":18,"shield":18,"speed":-12}}'::jsonb -> coalesce(p_id,'original');
$catalog$;

CREATE OR REPLACE FUNCTION public.stellar_combat_tactics_guard_v144() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $guard$
DECLARE old_state jsonb := CASE WHEN TG_OP='UPDATE' THEN OLD.state ELSE '{}'::jsonb END;
 hud jsonb;p jsonb;slot jsonb;conf text;id text;owned jsonb;old_id text;new_id text;old_mod jsonb;new_mod jsonb;
BEGIN
 IF NEW.state IS NULL THEN RETURN NEW;END IF;
 -- UPSERT runs BEFORE INSERT and BEFORE UPDATE. Only validate the UPDATE arm once.
 IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.game_saves s WHERE s.user_id=NEW.user_id) THEN RETURN NEW;END IF;
 owned:=coalesce(old_state->'ownedDroneFormationsV144','[]'::jsonb);
 -- Only trusted SQL administration may alter ownership; no new shop/acquisition path.
 IF coalesce(current_setting('stellar.formations_admin',true),'')<>'on' THEN
  IF NEW.state ? 'ownedDroneFormationsV144' AND NEW.state->'ownedDroneFormationsV144' IS DISTINCT FROM owned THEN RAISE EXCEPTION 'FORMATION_OWNERSHIP_RESERVED';END IF;
  IF old_state ? 'ownedDroneFormationsV144' THEN NEW.state:=jsonb_set(NEW.state,'{ownedDroneFormationsV144}',owned);END IF;
 ELSE owned:=coalesce(NEW.state->'ownedDroneFormationsV144','[]'::jsonb);END IF;
 IF jsonb_typeof(owned)<>'array' THEN RAISE EXCEPTION 'FORMATION_OWNERSHIP_INVALID';END IF;
 FOR id IN SELECT jsonb_array_elements_text(owned) LOOP IF public.stellar_formation_modifiers_v144(id) IS NULL THEN RAISE EXCEPTION 'FORMATION_ID_INVALID';END IF;END LOOP;
 -- Old clients/writers cannot erase new settings; preserve the authoritative field.
 IF NOT(NEW.state ? 'combatHudV144') AND old_state ? 'combatHudV144' THEN NEW.state:=jsonb_set(NEW.state,'{combatHudV144}',old_state->'combatHudV144');END IF;
 hud:=NEW.state->'combatHudV144';IF hud IS NULL THEN RETURN NEW;END IF;
 IF hud IS NOT DISTINCT FROM (old_state->'combatHudV144') AND owned IS NOT DISTINCT FROM coalesce(old_state->'ownedDroneFormationsV144','[]'::jsonb) THEN RETURN NEW;END IF;
 IF jsonb_typeof(hud)<>'object' OR hud->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(hud->'profiles')<>'object' OR NOT(hud->'profiles' ?& ARRAY['1','2']) THEN RAISE EXCEPTION 'COMBAT_HUD_INVALID';END IF;
 FOR conf IN SELECT unnest(ARRAY['1','2']) LOOP
  p:=hud#>ARRAY['profiles',conf];id:=p->>'formation';
  IF id IS NULL OR public.stellar_formation_modifiers_v144(id) IS NULL OR (id<>'original' AND NOT(owned ? id)) THEN RAISE EXCEPTION 'FORMATION_NOT_OWNED';END IF;
  IF NOT COALESCE('["lcb10","mcb25","mcb50","ucb100","sab50"]'::jsonb ? (p->>'laser'),false) OR NOT COALESCE('["r310","plt2026","plt2021","plt3030"]'::jsonb ? (p->>'rocket'),false) THEN RAISE EXCEPTION 'COMBAT_AMMO_INVALID';END IF;
  IF jsonb_typeof(p->'slots') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'slots')<>12 THEN RAISE EXCEPTION 'COMBAT_SLOTS_INVALID';END IF;
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
