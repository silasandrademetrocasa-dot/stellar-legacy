-- Stellar Legacy V20.1.0 - Battle 4-X PvP
-- Somente b41/b42/b43. Ataque a qualquer faccao, exceto propria conta.
-- Nenhuma conta, NPC, economia, dano existente ou registro de PvP e apagado.
BEGIN;
CREATE TABLE IF NOT EXISTS public.pvp_attack_cooldown_v201 (
  attacker_user_id uuid PRIMARY KEY,
  last_attack_at timestamptz NOT NULL DEFAULT '-infinity'::timestamptz
);
REVOKE ALL ON public.pvp_attack_cooldown_v201 FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.queue_pvp_attack(
 p_target_user_id uuid,p_damage bigint,p_shield_drain boolean,p_map_id text,p_territory_faction text)
 RETURNS TABLE(accepted boolean,effective_damage bigint,target_callsign text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp'
AS $pvp$
DECLARE
 v_uid uuid:=auth.uid();
 v_attacker public.player_presence%rowtype;
 v_target public.player_presence%rowtype;
 v_effective bigint;
 v_rate_count integer;
 v_dist numeric;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessao ausente.'; END IF;
 IF p_target_user_id IS NULL OR p_target_user_id=v_uid THEN RAISE EXCEPTION 'Alvo invalido.'; END IF;
 -- Cliente nao escolhe mapa autorizado: servidor valida presencas reais no banco.
 IF p_map_id IS NULL OR p_map_id NOT IN ('b41','b42','b43') OR p_territory_faction IS DISTINCT FROM 'battle' THEN
   RAISE EXCEPTION 'PvP permitido somente em 4-1, 4-2 ou 4-3.';
 END IF;
 SELECT * INTO v_attacker FROM public.player_presence WHERE user_id=v_uid
  AND updated_at>now()-interval '12 seconds';
 IF v_attacker.user_id IS NULL THEN RAISE EXCEPTION 'Sua presenca online nao esta sincronizada.'; END IF;
 SELECT * INTO v_target FROM public.player_presence WHERE user_id=p_target_user_id
  AND updated_at>now()-interval '12 seconds';
 IF v_target.user_id IS NULL THEN RAISE EXCEPTION 'Alvo offline.'; END IF;
 IF v_attacker.map_id<>p_map_id OR v_target.map_id<>p_map_id
    OR v_attacker.territory_faction IS DISTINCT FROM 'battle'
    OR v_target.territory_faction IS DISTINCT FROM 'battle' THEN
   RAISE EXCEPTION 'Alvo fora do Battle Map.';
 END IF;
 IF v_attacker.level<15 OR v_target.level<15 THEN
   RAISE EXCEPTION 'PvP 4-X exige nivel minimo 15.';
 END IF;
 IF v_attacker.hp<=0 OR v_target.hp<=0 THEN RAISE EXCEPTION 'Nave destruida: ataque indisponivel.'; END IF;
 -- Integrantes do mesmo grupo sao aliados mesmo nas zonas de PvP publico.
 IF EXISTS (SELECT 1 FROM public.battle_group_members_v179 a
   JOIN public.battle_group_members_v179 b ON b.group_id=a.group_id
   WHERE a.user_id=v_uid AND b.user_id=p_target_user_id) THEN
   RAISE EXCEPTION 'Fogo amigo bloqueado para seu grupo.';
 END IF;
 -- Margem de sincronizacao da presenca (4,5 s) sobre alcance laser (1.250u).
 v_dist:=sqrt(power(v_attacker.x-v_target.x,2)+power(v_attacker.y-v_target.y,2));
 IF v_dist>2200 THEN RAISE EXCEPTION 'Alvo distante: aproxime-se para disparar.'; END IF;
 IF p_damage IS NULL OR p_damage<1 OR p_damage>100000 THEN
   RAISE EXCEPTION 'Dano invalido por disparo.';
 END IF;
 -- Um limite por conta, nao por alvo, evita spam alternando jogadores.
 INSERT INTO public.pvp_attack_cooldown_v201(attacker_user_id,last_attack_at)
 VALUES(v_uid,now()) ON CONFLICT (attacker_user_id)
 DO UPDATE SET last_attack_at=EXCLUDED.last_attack_at
 WHERE public.pvp_attack_cooldown_v201.last_attack_at<=now()-interval '0.35 seconds';
 GET DIAGNOSTICS v_rate_count=ROW_COUNT;
 IF v_rate_count=0 THEN RAISE EXCEPTION 'Aguarde o proximo disparo PvP.'; END IF;
 IF coalesce(p_shield_drain,false) THEN
   v_effective:=least(greatest(0,coalesce(v_target.shield,0)),p_damage);
 ELSE v_effective:=p_damage; END IF;
 IF v_effective>0 THEN
  INSERT INTO public.pvp_damage_events(target_user_id,attacker_user_id,attacker_callsign,damage,shield_drain)
  VALUES(p_target_user_id,v_uid,coalesce(v_attacker.callsign,'Pilot'),v_effective,coalesce(p_shield_drain,false));
 END IF;
 RETURN QUERY SELECT true,v_effective,coalesce(v_target.callsign,'Pilot');
END;
$pvp$;
REVOKE ALL ON FUNCTION public.queue_pvp_attack(uuid,bigint,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.queue_pvp_attack(uuid,bigint,boolean,text,text) TO authenticated;
COMMIT;
