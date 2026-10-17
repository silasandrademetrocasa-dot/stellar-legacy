-- Stellar Legacy — missões coletivas de clã e histórico de campeões.
-- Não zera saves, temporadas, proprietários dos pontos A/B/C, nem redistribui prêmios antigos.
BEGIN;
CREATE INDEX IF NOT EXISTS stellar_war_actions_clan_kind_idx ON public.stellar_war_actions(clan_id,kind) WHERE clan_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.stellar_clan_operations (
 id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]{2,39}$'),
 title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 80),
 metric text NOT NULL CHECK (metric IN ('capture','defense')),
 target integer NOT NULL CHECK (target BETWEEN 1 AND 10000),
 vault_credits bigint NOT NULL DEFAULT 0 CHECK (vault_credits BETWEEN 0 AND 1000000),
 enabled boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 100
);
CREATE TABLE IF NOT EXISTS public.stellar_clan_operation_claims (
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 operation_id text NOT NULL REFERENCES public.stellar_clan_operations(id) ON DELETE RESTRICT,
 claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 credits bigint NOT NULL DEFAULT 0,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(clan_id,operation_id)
);
INSERT INTO public.stellar_clan_operations (id,title,metric,target,vault_credits,enabled,sort_order) VALUES
('uniao_estelar','Primeiros Setores', 'capture', 3, 25000, true, 10),
('escudo_coletivo','Linha de Defesa', 'defense', 5, 20000, true, 20),
('dominio_estelar','Campanha de Dominio', 'capture', 15, 100000, true, 30)
ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.stellar_clan_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_clan_operation_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_clan_operations,public.stellar_clan_operation_claims FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.stellar_clan_operations TO service_role;
GRANT SELECT,INSERT ON public.stellar_clan_operation_claims TO service_role;
GRANT SELECT ON public.clans TO service_role;
GRANT SELECT ON public.stellar_clan_operations TO authenticated;
DROP POLICY IF EXISTS stellar_clan_operation_list ON public.stellar_clan_operations;
CREATE POLICY stellar_clan_operation_list ON public.stellar_clan_operations FOR SELECT TO authenticated USING(enabled);

-- A conquista é contada no clã ao qual pertencia o piloto NO MOMENTO DA CONQUISTA.
-- Somente o dono atual do clã pode solicitar transferência única de Créditos ao cofre.
CREATE OR REPLACE FUNCTION public.stellar_claim_clan_operation(p_operation_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();v_clan uuid;v_objective public.stellar_clan_operations;
 v_progress bigint;v_old bigint;v_claimed boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT id INTO v_clan FROM public.clans WHERE owner_id=v_uid ORDER BY created_at LIMIT 1;
 IF v_clan IS NULL THEN RAISE EXCEPTION 'CLAN_OWNER_REQUIRED';END IF;
 SELECT * INTO v_objective FROM public.stellar_clan_operations WHERE id=p_operation_id AND enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_OPERATION_NOT_FOUND';END IF;
 SELECT vault_credits INTO v_old FROM public.clans WHERE id=v_clan AND owner_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_NOT_FOUND';END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_clan_operation_claims WHERE clan_id=v_clan AND operation_id=p_operation_id) THEN
   RETURN jsonb_build_object('ok',true,'already_claimed',true,'clan_id',v_clan,'vault_credits',v_old);
 END IF;
 SELECT count(*) INTO v_progress FROM public.stellar_war_actions WHERE clan_id=v_clan AND kind=v_objective.metric;
 IF v_progress<v_objective.target THEN RAISE EXCEPTION 'CLAN_OBJECTIVE_NOT_COMPLETE';END IF;
 INSERT INTO public.stellar_clan_operation_claims(clan_id,operation_id,claimed_by,credits)
 VALUES(v_clan,p_operation_id,v_uid,v_objective.vault_credits);
 UPDATE public.clans SET vault_credits=coalesce(vault_credits,0)+v_objective.vault_credits,updated_at=now()
 WHERE id=v_clan RETURNING vault_credits INTO v_old;
 RETURN jsonb_build_object('ok',true,'already_claimed',false,'clan_id',v_clan,'credits',v_objective.vault_credits,'vault_credits',v_old);
END;$$;
REVOKE ALL ON FUNCTION public.stellar_claim_clan_operation(text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.stellar_claim_clan_operation(text) TO authenticated;

-- Histórico de temporadas encerradas. Só usa ações verificadas pelo servidor.
CREATE OR REPLACE VIEW public.stellar_competitive_history WITH (security_invoker=true) AS
SELECT s.id,s.title,s.starts_at,s.ends_at,s.top_n,
 (SELECT count(DISTINCT a.actor_user_id)::int FROM public.stellar_war_actions a
  WHERE a.occurred_at>=s.starts_at AND a.occurred_at<s.ends_at AND a.actor_user_id IS NOT NULL) as pilots,
 (SELECT count(*)::int FROM public.stellar_competitive_claims c WHERE c.season_id=s.id) as rewards_claimed,
 (SELECT faction FROM public.stellar_war_actions a WHERE a.occurred_at>=s.starts_at AND a.occurred_at<s.ends_at
    GROUP BY faction ORDER BY sum(case when kind='capture' then 10 else 3 end) DESC,faction LIMIT 1) as winning_faction
FROM public.stellar_competitive_seasons s
WHERE s.enabled AND s.ends_at<=now();
REVOKE ALL ON public.stellar_competitive_history FROM public,anon,authenticated;
GRANT SELECT ON public.stellar_competitive_history TO service_role;
-- Missões já resgatadas são definitivas: nem o ADM reconfigura meta ou premiação retroativamente.
CREATE OR REPLACE FUNCTION public.stellar_clan_operation_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.stellar_clan_operation_claims WHERE operation_id=old.id)
    AND (new.metric,new.target,new.vault_credits,new.id) IS DISTINCT FROM
        (old.metric,old.target,old.vault_credits,old.id) THEN
  RAISE EXCEPTION 'CLAN_OPERATION_LOCKED_AFTER_CLAIM';
 END IF;
 RETURN new;
END;$$;
DROP TRIGGER IF EXISTS stellar_clan_operation_guard ON public.stellar_clan_operations;
CREATE TRIGGER stellar_clan_operation_guard BEFORE UPDATE ON public.stellar_clan_operations
FOR EACH ROW EXECUTE FUNCTION public.stellar_clan_operation_guard();
COMMIT;
