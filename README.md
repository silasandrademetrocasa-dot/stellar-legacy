# Stellar Legacy V30.1.1 — Pacote enxuto

Versão de produção com sprites de 16 direções para naves, drones e NPCs, preservando designers, saves, controles, SQL e compatibilidade com Render.

## Instalação pelo GitHub Actions

1. Faça backup/commit de alterações pessoais do repositório.
2. Remova ZIPs `stellar-legacy*.zip` antigos da raiz do GitHub.
3. Suba **somente** `stellar-legacy-V30.1.1-COMPLETO-LIMPO.zip` para a raiz (não extraia).
4. Rode **Actions → Instalar versão do Stellar Legacy → Run workflow**.
5. O instalador usa `rsync --delete` para remover docs/testes antigos do Git e preserva `.github/` e os scripts do instalador.

## Verificação

`npm run verify`: arquivos essenciais, imports, assets, smoke tests. Para rodar os **353 testes de regressão históricos**, use o ZIP de backup separado `stellar-legacy-V30-BACKUP-DOCS-TESTES.zip`, restaurando temporariamente a pasta `tests/` e `package.json` ajustado se necessário.

**Sem SQL novo.** O diretório `sql/` permanece intacto. O repositório remoto não é atualizado até o instalador executar com sucesso.

### Orientação oficial dos atlas
Frame 0 = NORTE; sentido horário; jogador angle=0 -> LESTE; NPCs usando atan2 direto; drones acompanham órbita tangencial.
