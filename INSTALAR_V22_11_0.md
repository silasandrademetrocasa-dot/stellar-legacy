# STELLAR LEGACY V22.11.0 — COMBATE E AUX-9 INTELIGENTES

**Instalação:** envie apenas `stellar-legacy-V22.11.0-COMBATE-AUX-PROTOCOLOS.zip` para a raiz da branch `main` do GitHub; em Actions execute `Instalar versão do Stellar Legacy` → `Run workflow`. O nome deve permanecer todo em minúsculas no prefixo `stellar-legacy`. Aguarde o Render e force atualização no navegador / PWA, se necessário.

**SQL:** nenhum SQL novo. **Não há operação de limpeza ou redefinição de contas.**

## O que muda
- AUX-9: passa a usar seus espaços de protocolo já desbloqueados por nível. Até três pontos por especialização, respeitando o total de espaços e exigindo o respectivo módulo adquirido. As escolhas são gratuitas e persistidas no save.
- Sentinela/Guarda: +6% de dano do AUX e +6% de alcance defensivo por ponto, além de resposta de laser ~5% mais rápida por ponto. **Somente revida a NPCs que efetivamente causaram dano recente à nave (12s)**; nunca caçador indiscriminado.
- Minerador: +8% velocidade de busca/deslocamento por ponto; até +24%. Em mapas locais/offline, +8% de área de busca por ponto. Em mapas multiplayer online, o raio de mineração permanece limitado ao permitido pelo servidor.
- Salvager: +8% de alcance de busca e +10% de velocidade de coleta/deslocamento por ponto. Prioriza boxes próximos do vencimento e bônus dentro do raio permitido.
- Reclaimer: +10% de taxa de reparação de HP por ponto (máximo +30%).
- Nova Burst (Kamikaze): +8% de dano e +4% de raio de explosão por ponto; recarga original preservada. Disponível somente pelo AUX-9.
- Combate: troca automática de alvo (para quem já possui direito a auto-combate) prefere NPC agressor recente a NPC neutro, sem alterar a seleção manual. Indicador de ESCUDO CRÍTICO durante combate.
- Segurança: o Render valida as alocações (0–3 por protocolo, orçamento pelo nível); payload inválido é **rejeitado sem autoban**. Nenhum protocolo gera CR, STL, minério, caixa ou item adicional via navegador.

## Validar após o deploy
1. AUX-9 → protocolos, distribuir e retirar pontos, recarregar jogo e confirmar persistência.
2. Sentinela: NPC neutro perto = sem ataque; NPC causa dano = o AUX revida por até 12 s, se estiver ao alcance.
3. Minerador: coletar manualmente e com AUX, conferir porão após F5 e recibo de servidor; não espera quantidade extra.
4. Salvager: coletar caixas próximas e ao vencerem, verificando preservação de cargas e porão cheio.
5. Reclaimer: conferir diferença de velocidade de reparação com 0 e 3 pontos.
6. Nova Burst: comparar dano e raio 0/3 pontos, cooldown intacto.
7. Combate: observar prioridade do agressor no auto-combate Premium/Passe e aviso de escudo crítico.
8. Confirmar que mapas, PvP e economia não sofreram regressão.

## Limites e próximos passos
Esses bônus têm limites e não tornam a economia 100% autoritativa. O dano legado de NPC/PvE e diversas recompensas ainda precisam de validação integral do servidor antes de compras reais. Testes automatizados e de layout não substituem validar o gameplay publicado no Render.
