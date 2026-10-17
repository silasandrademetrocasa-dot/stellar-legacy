> **Atualização atual:** Segurança e Antifraude. Leia [INSTALAR_V22_6_0.md](INSTALAR_V22_6_0.md).

# Stellar Legacy V22.5.0 — Universo Dinâmico e Missões Coletivas

**ANTES DO DEPLOY:** leia `INSTALAR_V22_5_0.md`. A nova migração SQL está **pendente**, porque o acesso de escrita ao Supabase foi bloqueado na preparação. Execute `sql/STELLAR_V22_5_0_CLAN_OPERATIONS_HALL.sql` no Supabase e confirme a execução antes de subir o ZIP.

Novidades: invasões, chefes e recursos programados no ADM via servidor; missões coletivas e recompensas únicas para o cofre do clã; arquivo competitivo; novos módulos de servidor e testes.

O motor existente de eventos, combate, territórios A/B/C, CONF 1/2, saves e balanceamento de movimento permanece preservado. Eventos dinâmicos não adicionam recompensas inéditas.

Documentação: `V22_5_0_RELATORIO.md` e `INSTALAR_V22_5_0.md`.

# Stellar Legacy — 22.0.0

**Entrega unificada: Campeonato Galáctico + Elite equipável + Operações do Universo + Rankings de Clãs + organização modular.**

## Instalação

1. SQLs da V22 **já foram aplicados e conferidos** no Supabase `stellar-legacy`. Arquivos de referência: `sql/STELLAR_V22_0_0_TEMPORADAS_ELITE_UNIVERSO.sql` e `sql/STELLAR_V22_0_1_TITULOS_ALTERNAVEIS.sql`.
2. Mantenha `SUPABASE_SERVICE_ROLE_KEY` **somente no Render** (nunca no cliente ou ZIP preenchido).
3. Coloque somente o ZIP completo da V22 na raiz do GitHub, sem extrair, e execute `Actions → Instalar versão do Stellar Legacy → Run workflow`.
4. Confira a versão em `/health`, acesso ao Centro de Comando, Guerra (A/B/C), Elite, Temporada e ADM.

### Conteúdo

- **Temporada** no Centro de Comando: classificação por capturas e defesas de guerra confirmadas pelo servidor; ranking de clãs/facções; histórico e resgate seguro após o encerramento.
- **ADM** na aba Temporada: criação e edição de temporadas futuras (rascunhos por padrão) e avisos de operações por mapa.
- **Elite**: equipar títulos conquistados, exibir na identificação da nave e voltar aos títulos comuns.
- **Universo**: alertas com validade automática. **Apenas comunicação e calendário** — NPCs, ondas e recompensas continuam gerenciados pelo sistema existente de Eventos.
- **Motor**: funções novas separadas em módulos; combate, CONF 1/2, navegação, A/B/C e saves preservados.

**Atenção:** nenhuma temporada ou alerta ficou ativo automaticamente. O Passe de Batalha atual funciona separadamente. Novos spawns e missões especiais de clã com recompensas exigem outro ciclo de desenvolvimento.

Leia `INSTALAR_V22_0_0.md`, `V22_0_0_RELATORIO.md` e `CHANGELOG.md`.
