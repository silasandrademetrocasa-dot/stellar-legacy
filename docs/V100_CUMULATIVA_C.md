# STELLAR LEGACY — V100 CUMULATIVA C (V98–V100)

**Instalação direta:** V97 `47.7.53` → V100 `47.7.56`.
**NÃO é lançamento comercial aprovado:** esta é uma candidata de diagnóstico e preparação para testes ampliados.

## V98 — Arena, clãs, relés e Warfront

- Nova auditoria administrativa **somente leitura** em `GET /api/admin/v98/competitive-audit`.
- Valida contagem e amostras de batalhas da Arena, dano PvP, clãs, membros, ações Warfront, relés, nós e campanhas.
- Alerta sobre relés duplicados, facção inválida em nós territoriais, duas campanhas simultâneas, vínculos incompletos de clã e tabelas vazias.
- Acesso exige login, sessão única válida e privilégio de administrador.
- **Não** altera resultados, rankings, matchmaking, recompensas, pontos, disputa territorial ou estado de relés.

## V99 — Auditoria ADM e comparação de Live Ops

- Nova rota de leitura `GET /api/admin/v99/liveops-snapshot`.
- Inclui configurações de NPCs, populações, mapas, categorias de missão, ondas de Aurora/Nexus/Eclipse, recompensas astrais e regras de Warfront/relés.
- Exporta um hash SHA-256 e permite capturar uma referência temporária e **comparar as seções alteradas**, sem executar SQL nem salvar uma mudança.
- O botão de cópia permite registrar um snapshot de referência (não é backup automático no banco).
- Valida autorização ADM, sessão e fontes disponíveis. **Falha explicitamente** se alguma consulta estiver indisponível em vez de entregar dados parciais como completos.

## V100 — Pré-checagem WEB / APK

- Novo diagnóstico ADM em `GET /api/admin/v100/readiness`.
- Confirma a presença de arquivos Web/APK críticos no servidor, sem executar gameplay e sem conceder recompensas.
- Novo comando `npm run preflight:v100` valida localmente fontes e projeto Android.
- Código Web e versão Android atualizados para `47.7.56`, preservando `WebViewAssetLoader` e gráficos dentro do APK.
- Não modifica o fluxo de Farm Offline, Autopilot Astral, compras, saves, XP, Portais Astrais ou combate.

## Como usar

1. Instale o ZIP pelo Instalador Universal sobre V97 `47.7.53`.
2. Após deploy do Render, abra **ADM → COMBATE → BALANCEAMENTO**.
3. Use os botões **AUDITAR ARENA/CLÃS/WARFRONT**, **CAPTURAR REFERÊNCIA ADM**, **COMPARAR COM AGORA** e **VERIFICAR PRONTIDÃO WEB/APK**.
4. Para gerar novo APK, rode o workflow já corrigido `Instalapk.yml` no GitHub. **A pasta `.github` é protegida pelo Instalador Universal**; o workflow que existe no GitHub não é substituído por este ZIP. Deve usar `android-actions/setup-android@v4`, conforme correção anterior.
5. Faça testes reais com duas contas, Arena/Warfront, Farm Offline e pelo menos 1 hora de Autopilot Astral.

## O que significa o resultado

- `154/154` testes automatizados e pré-checagem local são critérios de **integridade de código**, não prova de servidor ao vivo ou de FPS no dispositivo.
- Nenhuma permissão de sessão foi contornada e nenhuma mudança no Supabase foi realizada durante a criação deste pacote.
- **Sem SQL, sem mudança de economia, sem recompensas retroativas.**
- O rollback do código não altera as configurações já publicadas anteriormente no banco.

## Segurança

- Auditorias administrativas não expõem IDs individuais de jogadores nos relatórios ao cliente.
- A exportação de Live Ops contém apenas configurações de jogo, sem senhas, tokens, serviços privilegiados, contas ou saves de jogadores.
- Os botões de leitura não fazem mudanças persistentes nem criam sessões de pagamento.
- Em caso de erro de banco, a API informa que a consulta está incompleta e não anuncia uma aprovação falsa.
