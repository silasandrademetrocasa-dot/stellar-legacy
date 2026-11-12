-- STELLAR LEGACY V119.0 - NUCLEO UNICO, ETAPA 1 (PREPARAR)
-- NAO executar com Farm ativo. Nao sobrescreve inventarios, saldos ou saves.
-- game_saves permanece como UNICO estado canonico. Todas as demais tabelas abaixo
-- guardam somente versao, recibos, logs de alteracoes e backups A/B/C.
-- EXECUTAR APENAS COM BACKUP e apos verificar ambiente de homologacao.

CREATE TABLE IF NOT EXISTS public.stellar_player_save_head_v119 (
  user_id uuid PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision>=0),
  state_hash text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.stellar_player_save_checkpoint_v119 (
  user_id uuid NOT NULL,
  slot char(1) NOT NULL CHECK (slot IN ('A','B','C')),
  revision bigint NOT NULL CHECK (revision>=0),
  state jsonb NOT NULL,
  state_hash text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id,slot)
);
CREATE TABLE IF NOT EXISTS public.stellar_player_save_journal_v119 (
  journal_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  revision bigint NOT NULL,
  modules text[] NOT NULL DEFAULT ARRAY['geral']::text[],
  before_hash text,
  after_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT save_v119_journal_unique UNIQUE (user_id,revision)
);
CREATE INDEX IF NOT EXISTS stellar_save_journal_v119_lookup
  ON public.stellar_player_save_journal_v119(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.stellar_player_save_operation_v119 (
  user_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  request_hash text NOT NULL,
  result jsonb NOT NULL,
  revision bigint NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id,operation_id)
);
CREATE INDEX IF NOT EXISTS stellar_save_operation_v119_recent
  ON public.stellar_player_save_operation_v119(user_id,committed_at DESC);

-- Tabelas internas: nenhum cliente pode inserir recibos ou backups.
ALTER TABLE public.stellar_player_save_head_v119 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_player_save_checkpoint_v119 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_player_save_journal_v119 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_player_save_operation_v119 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stellar_player_save_head_v119 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON TABLE public.stellar_player_save_checkpoint_v119 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON TABLE public.stellar_player_save_journal_v119 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON TABLE public.stellar_player_save_operation_v119 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.stellar_player_save_head_v119 TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.stellar_player_save_checkpoint_v119 TO service_role;
GRANT SELECT,INSERT ON TABLE public.stellar_player_save_journal_v119 TO service_role;
GRANT SELECT,INSERT ON TABLE public.stellar_player_save_operation_v119 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.stellar_player_save_journal_v119_journal_id_seq TO service_role;

-- Base de seguranca inicial; nao cria 3 copias falsas da mesma gravacao.
-- Impede uma gravacao concorrente entre os dois SELECTs iniciais; curto lock na instalacao.
LOCK TABLE public.game_saves IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.stellar_player_save_head_v119(user_id,revision,state_hash,changed_at)
 SELECT user_id,0,md5(state::text),updated_at FROM public.game_saves WHERE state IS NOT NULL
 ON CONFLICT(user_id) DO NOTHING;
INSERT INTO public.stellar_player_save_checkpoint_v119(user_id,slot,revision,state,state_hash,captured_at)
 SELECT g.user_id,'A',h.revision,g.state,md5(g.state::text),g.updated_at
 FROM public.game_saves g JOIN public.stellar_player_save_head_v119 h ON h.user_id=g.user_id
 WHERE g.state IS NOT NULL ON CONFLICT(user_id,slot) DO NOTHING;

-- Toda atualizacao confirmada (NPC, minerio, compra, leilao, equipamento, missoes,
-- Farm) incrementa o MESMO numero de revisao. A captura e via trigger canonico;
-- nenhum modulo grava diretamente nas copias.
CREATE OR REPLACE FUNCTION public.stellar_capture_canonical_save_v119()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $capture$
DECLARE
 v_now timestamptz:=clock_timestamp();
 v_hash text;
 v_before text;
 v_rev bigint;
 v_previous public.stellar_player_save_checkpoint_v119%rowtype;
 v_b public.stellar_player_save_checkpoint_v119%rowtype;
 v_important boolean:=false;
 v_modules text[]:=ARRAY[]::text[];
BEGIN
 v_hash:=md5(NEW.state::text);
 IF TG_OP='UPDATE' THEN
  IF NEW.state IS NOT DISTINCT FROM OLD.state THEN RETURN NULL; END IF;
  v_before:=md5(OLD.state::text);
  IF NEW.state->'drones' IS DISTINCT FROM OLD.state->'drones' OR
     NEW.state->'shipLoadout' IS DISTINCT FROM OLD.state->'shipLoadout' OR
     NEW.state->'combatConfigsV2013' IS DISTINCT FROM OLD.state->'combatConfigsV2013' OR
     NEW.state->'pet' IS DISTINCT FROM OLD.state->'pet' OR
     NEW.state->'inventory' IS DISTINCT FROM OLD.state->'inventory' THEN
     v_modules:=array_append(v_modules,'hangar');v_important:=true;
  END IF;
  IF NEW.state->'missions' IS DISTINCT FROM OLD.state->'missions' OR
     NEW.state->'battlePass' IS DISTINCT FROM OLD.state->'battlePass' THEN
     v_modules:=array_append(v_modules,'missoes');v_important:=true;
  END IF;
  IF NEW.state->'auction' IS DISTINCT FROM OLD.state->'auction' THEN
     v_modules:=array_append(v_modules,'leilao');v_important:=true;
  END IF;
  IF NEW.state->'serverPurchaseRevision' IS DISTINCT FROM OLD.state->'serverPurchaseRevision' OR
     NEW.state->'profile'->'credits' IS DISTINCT FROM OLD.state->'profile'->'credits' OR
     NEW.state->'profile'->'uridium' IS DISTINCT FROM OLD.state->'profile'->'uridium' THEN
     v_modules:=array_append(v_modules,'economia');
  END IF;
  IF NEW.state->'serverNpcRewardRevision' IS DISTINCT FROM OLD.state->'serverNpcRewardRevision' OR
     NEW.state->'serverOreRevision' IS DISTINCT FROM OLD.state->'serverOreRevision' THEN
     v_modules:=array_append(v_modules,'combate');
  END IF;
 ELSE
  v_before:=NULL;v_modules:=ARRAY['criacao']::text[];v_important:=true;
 END IF;
 IF array_length(v_modules,1) IS NULL THEN v_modules:=ARRAY['progresso']::text[]; END IF;
 INSERT INTO public.stellar_player_save_head_v119(user_id,revision,state_hash,changed_at)
 VALUES(NEW.user_id,1,v_hash,v_now)
 ON CONFLICT(user_id) DO UPDATE SET revision=public.stellar_player_save_head_v119.revision+1,
 state_hash=EXCLUDED.state_hash,changed_at=EXCLUDED.changed_at
 RETURNING revision INTO v_rev;
 -- Backups por geracao, respeitando a frequencia de mudancas de NPC.
 SELECT * INTO v_previous FROM public.stellar_player_save_checkpoint_v119
   WHERE user_id=NEW.user_id AND slot='A' FOR UPDATE;
 IF v_previous.user_id IS NOT NULL AND v_previous.state_hash<>v_hash THEN
   SELECT * INTO v_b FROM public.stellar_player_save_checkpoint_v119
     WHERE user_id=NEW.user_id AND slot='B' FOR UPDATE;
   IF v_important OR v_b.user_id IS NULL OR v_now-v_b.captured_at>=interval '60 seconds' THEN
     IF v_b.user_id IS NOT NULL THEN
       INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
       (user_id,slot,revision,state,state_hash,captured_at)
       VALUES(NEW.user_id,'C',v_b.revision,v_b.state,v_b.state_hash,v_b.captured_at)
       ON CONFLICT(user_id,slot) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state,
       state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
     END IF;
     INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
     (user_id,slot,revision,state,state_hash,captured_at)
     VALUES(NEW.user_id,'B',v_previous.revision,v_previous.state,v_previous.state_hash,v_previous.captured_at)
     ON CONFLICT(user_id,slot) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state,
       state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
   END IF;
 END IF;
 INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
 (user_id,slot,revision,state,state_hash,captured_at)
 VALUES(NEW.user_id,'A',v_rev,NEW.state,v_hash,v_now)
 ON CONFLICT(user_id,slot) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state,
 state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
 INSERT INTO public.stellar_player_save_journal_v119
 (user_id,revision,modules,before_hash,after_hash,created_at)
 VALUES(NEW.user_id,v_rev,v_modules,v_before,v_hash,v_now);
 RETURN NULL;
END $capture$;

-- Apenas a FUNCAO e preparada aqui. Ativacao dos triggers num segundo SQL.
-- Nao criar triggers nem trocar funcoes de Farm, NPC ou leilao sem homologacao.
REVOKE ALL ON FUNCTION public.stellar_capture_canonical_save_v119() FROM PUBLIC,anon,authenticated;

-- Leitura atomica: estado, hash e numero da revisao no MESMO snapshot SQL.
CREATE OR REPLACE FUNCTION public.stellar_read_player_save_v119(p_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp STABLE
AS $read$
 SELECT jsonb_build_object('state',g.state,'updated_at',g.updated_at,'revision',h.revision,
   'verified',h.state_hash=md5(g.state::text))
 FROM public.game_saves g JOIN public.stellar_player_save_head_v119 h ON h.user_id=g.user_id
 WHERE g.user_id=p_user_id;
$read$;
REVOKE ALL ON FUNCTION public.stellar_read_player_save_v119(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_read_player_save_v119(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_commit_player_command_v119(
 p_user_id uuid,p_operation_id uuid,p_module text,p_action text,
 p_state jsonb,p_callsign text,p_expected_revision bigint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $commit$
DECLARE
 v_existing public.stellar_player_save_operation_v119%rowtype;
 v_head public.stellar_player_save_head_v119%rowtype;
 v_hash text;
 v_result jsonb;
 v_rev bigint;
BEGIN
 IF p_user_id IS NULL OR p_operation_id IS NULL OR p_state IS NULL OR
    jsonb_typeof(p_state)<>'object' OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
 THEN RAISE EXCEPTION 'SAVE_COMMAND_INVALID'; END IF;
 IF p_module NOT IN ('checkpoint','hangar','missoes','economia','leilao','farm','combate','server')
   OR p_action NOT IN ('save','commit') THEN RAISE EXCEPTION 'SAVE_ACTION_NOT_ALLOWED'; END IF;
 v_hash:=md5(p_state::text);
 -- Bloqueio por conta inclusive quando a operacao anterior nao tem recibo.
 PERFORM 1 FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 SELECT * INTO v_existing FROM public.stellar_player_save_operation_v119
 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF v_existing.user_id IS NOT NULL THEN
   IF v_existing.request_hash<>v_hash OR v_existing.module<>p_module OR v_existing.action<>p_action
   THEN RAISE EXCEPTION 'SAVE_IDEMPOTENCY_ID_REUSED'; END IF;
   RETURN v_existing.result||jsonb_build_object('replayed',true);
 END IF;
 SELECT * INTO v_head FROM public.stellar_player_save_head_v119 WHERE user_id=p_user_id FOR UPDATE;
 IF v_head.user_id IS NULL THEN RAISE EXCEPTION 'SAVE_HEAD_NOT_INITIALIZED';END IF;
 IF p_module IN ('checkpoint','hangar') AND p_expected_revision IS NULL THEN
   RETURN jsonb_build_object('ok',false,'code','SAVE_REVISION_REQUIRED',
      'message','Atualize o jogo para confirmar a alteracao com a revisao oficial.');
 END IF;
 IF p_expected_revision IS NOT NULL AND p_expected_revision<>v_head.revision THEN
   RETURN jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT','revision',v_head.revision,
     'message','O estado do jogador mudou. Atualize para confirmar sua acao sem perder progresso.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.game_saves'::regclass
       AND tgname='stellar_capture_save_update_v119' AND tgenabled<>'D') THEN
   RAISE EXCEPTION 'SAVE_CAPTURE_NOT_ACTIVE';
 END IF;
 -- Guardas anti-fraude, saves de missao, inventario e NPC continuam no v118.
 -- A funcao V118 e unica fonte de escrita do fluxo HTTP ate os demais RPCs
 -- legados serem migrados para comandos especificos.
 v_result:=public.stellar_commit_player_save_v118(p_user_id,p_state,clock_timestamp(),p_callsign);
 IF v_result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'SAVE_COMMIT_NOT_CONFIRMED';END IF;
 SELECT revision INTO v_rev FROM public.stellar_player_save_head_v119 WHERE user_id=p_user_id;
 INSERT INTO public.stellar_player_save_operation_v119
 (user_id,operation_id,module,action,request_hash,result,revision)
 VALUES(p_user_id,p_operation_id,p_module,p_action,v_hash,
   jsonb_build_object('ok',true,'revision',v_rev,'operation_id',p_operation_id),v_rev);
 RETURN jsonb_build_object('ok',true,'revision',v_rev,'operation_id',p_operation_id,'replayed',false);
END $commit$;
REVOKE ALL ON FUNCTION public.stellar_commit_player_command_v119(uuid,uuid,text,text,jsonb,text,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_commit_player_command_v119(uuid,uuid,text,text,jsonb,text,bigint)
 TO service_role;

-- Leitura por modulo, sem fonte concorrente para saldo ou inventario.
CREATE OR REPLACE VIEW public.stellar_player_save_modules_v119 AS
 SELECT journal_id,user_id,revision,unnest(modules) AS module,created_at,before_hash,after_hash
 FROM public.stellar_player_save_journal_v119;
REVOKE ALL ON public.stellar_player_save_modules_v119 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.stellar_player_save_modules_v119 TO service_role;

COMMENT ON TABLE public.stellar_player_save_head_v119 IS 'Metadado da UNICA fonte de verdade game_saves; nao contem saldos ou inventario';
COMMENT ON TABLE public.stellar_player_save_operation_v119 IS 'Recibos de comandos, nunca um segundo save';

NOTIFY pgrst, 'reload schema';
