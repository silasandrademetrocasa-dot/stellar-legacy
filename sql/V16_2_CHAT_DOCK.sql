-- Stellar Legacy V16.2.0 — CHAT DOCK hardening + indexes
ALTER TABLE public.game_chat_messages_v16 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.game_chat_messages_v16 FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS game_chat_v16_global_created_idx
  ON public.game_chat_messages_v16 (created_at DESC)
  WHERE channel='global';

CREATE INDEX IF NOT EXISTS game_chat_v16_clan_created_idx
  ON public.game_chat_messages_v16 (clan_id, created_at DESC)
  WHERE channel='clan';

CREATE INDEX IF NOT EXISTS game_chat_v16_private_pair_created_idx
  ON public.game_chat_messages_v16 (sender_user_id, recipient_user_id, created_at DESC)
  WHERE channel='private';

GRANT EXECUTE ON FUNCTION public.send_chat_message_v16(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_history_v16(text,text,integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.send_chat_message_v16(text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_chat_history_v16(text,text,integer) FROM anon;
