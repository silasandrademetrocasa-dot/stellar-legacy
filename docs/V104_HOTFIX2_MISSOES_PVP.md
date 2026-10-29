# V104 HOTFIX2 — Missoes + reduzir leituras PvP em mapas PvE

Base: **47.7.60 (V104)**. Pacote incremental (copiar os caminhos sobre o repositorio) que **substitui o HOTFIX1 anterior**. **Nao aplique os dois ZIPs** — use somente o HOTFIX2. Mantem o `package.json` na versao 47.7.60 para nao interferir nos instaladores.

## Correcao de missoes (herdada do HOTFIX1)
- Save com geracao de alteracoes: uma escrita antiga nao elimina novo progresso ou aceite.
- Aceitar, trocar, abandonar ou completar solicita sincronizacao de alta prioridade.
- `SAVE_NPC_STALE`/`SAVE_ORE_STALE` recuperam apenas missao ativa e progresso parcial nao recompensado apos releitura do servidor; nunca restauram moedas nem itens.
- Mantem contrato diario ja aceito mesmo quando configuracoes mudam.

## Requisicoes PvP (novo HOTFIX2)
- Em mapas PvE **zero consultas periodicas** para `consume_pvp_damage_events`.
- Em 4-1, 4-2 e 4-3 **mantem** polling a cada 450 ms para nao atrasar dano.
- Ao sair de PvP, consulta a inbox **uma vez**, descartando eventos atrasados sem aplicar dano fora da arena; se falhar, tenta novamente apos 15 s, sem flood.
- Leitura ao entrar em PvP continua imediata; nenhuma mudanca em RPC ou regras antifraude.
- `public/index.html` troca a versao do script para evitar cache na Web.

## Medicoes de 28/10 das 21h as 23h
- Foram registradas **13.598** chamadas para RPC de dano PvP em 2h, quase 1,9/s. Uma V104 corretamente ativa em mapas PvE deveria fazer no maximo ~480 leituras nessa janela (cadencia 15s), o que evidencia provavel APK antigo ou caminho alternativo. HOTFIX2 deve chegar ao aparelho via **novo APK**.
- No banco ocorreram 49 `SAVE_NPC_STALE` e um `SAVE_ORE_STALE`. Esses sinais sao protecoes legitimas de revisao de recompensas, **nao evidencia conclusiva de que todas falhas tenham sido causadas por missoes**.
- SQL e schema de producao **nao foram alterados**. Nenhum deploy realizado por este pacote.

## Validacao apos implantar
1. Subir apenas os arquivos do HOTFIX2 ao GitHub, com a mesma arvore de pastas; gerar **outro APK** e instala-lo. Se atualizar somente o Render, o APK antigo continuara usando o game.js antigo.
2. Em X-1/X-2/X-3/X-5, deixar o Autopilot ativo 10-15 min e checar o numero de `consume_pvp_damage_events` no Supabase: **esperado zero para um cliente ja em PvE**, fora limpeza pontual apos um PvP.
3. Entrar nos mapas 4-X, atacar/receber dano, sair para PvE, esperar 2 min, reentrar: nao perder nem ganhar dano em mapa seguro, nem atrasar hits no PvP.
4. Aceitar missao com Autopilot ligado, conferir persistencia apos 10-20 NPCs, relogar e concluir com recompensa unica.
5. Comparar `SAVE_NPC_STALE` e `SAVE_ORE_STALE` antes/depois. **Nao desativar triggers de seguranca** para esconder esses conflitos.
6. Fazer testes de 1 e 2 jogadores simultaneos e inspecionar chamadas restantes de sessao, chat, offline farm e telemetria. Essas rotas nao sao alteradas no HOTFIX2.

## Limites
- E uma correcao no **cliente**; se o APK novo nao for instalado, nao ha reducao da RPC no celular antigo.
- Reducao potencial da RPC nao e um percentual confirmado de economias totais de banda/CPU; medir depois.
- O problema de missoes e um diagnostico sustentado por revisao estatica e logs, mas precisa validar a correcao no APK. Falhas de recompensas de NPC com `userId` nulo exigem investigacao separada.
