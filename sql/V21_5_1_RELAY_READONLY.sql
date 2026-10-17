-- Controle de setor: leitura autenticada, exclusivamente para exibir a posse existente.
-- NÃO autoriza captura, mudança de dono, pontuação nem resgate pelo cliente.
begin;
revoke select on public.stellar_warfront_nodes from anon,authenticated;
grant select (map_id,node_id,owner,revision,captured_at) on public.stellar_warfront_nodes to authenticated;
drop policy if exists stellar_relay_owner_read on public.stellar_warfront_nodes;
create policy stellar_relay_owner_read on public.stellar_warfront_nodes
 for select to authenticated using (true);
commit;
