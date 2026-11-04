-- Visao SOMENTE LEITURA de eventos: nao contem saldos nem inventario alternativos.
-- Fonte canonica: public.game_saves. Fontes abaixo sao recibos/historico.
-- Postgres >=15: security_invoker garante permissoes/RLS do leitor.
CREATE OR REPLACE VIEW public.stellar_player_save_audit_v1191
WITH (security_invoker=true) AS
SELECT user_id,issued_at AS happened_at,'combate'::text AS module,'npc'::text AS event,
       jsonb_build_object('npc',npc_type,'credits',credits,'stl',stl) AS summary
FROM public.stellar_npc_reward_ledger
UNION ALL
SELECT user_id,issued_at,'combate','minerio',
       jsonb_build_object('resource',resource,'amount',amount)
FROM public.stellar_ore_reward_ledger
UNION ALL
SELECT user_id,updated_at,'leilao','lance',
       jsonb_build_object('product',coalesce(lot->>'name',lot_ref),
                          'bid',user_bid,'status',status)
FROM public.auction_bids
UNION ALL
SELECT user_id,coalesce(completed_at,started_at),'farm','sessao',
       jsonb_build_object('status',status,'started_at',started_at,'ends_at',ends_at)
FROM public.stellar_offline_farm_v484
UNION ALL
SELECT user_id,created_at,'save','confirmacao',
       jsonb_build_object('revision',revision,'modules',modules)
FROM public.stellar_player_save_journal_v119;
REVOKE ALL ON public.stellar_player_save_audit_v1191 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.stellar_player_save_audit_v1191 TO service_role;
-- View nunca substitui logs especificos nem possui INSERT/UPDATE/DELETE.
