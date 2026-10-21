# Stellar Legacy

Jogo web multiplayer em evolução contínua. A documentação técnica e as migrações permanecem em `sql/`, `tests/` e `scripts/`.

## Instalação de atualizações

1. Faça backup antes de alterações econômicas ou de banco.
2. Mantenha apenas um ZIP de atualização na raiz do repositório.
3. Execute o workflow **Instalador Universal** no GitHub Actions.
4. A instalação só publica mudanças após validação de sintaxe, consistência e testes.

## Estrutura

- `public/`: interface, assets e cliente do jogo.
- `server/`: APIs, regras e integração do mundo.
- `sql/`: histórico das migrações para banco de dados.
- `tests/`: testes de regressão.
- `scripts/`: verificações e instalador.

**Versões internas de cache e API não devem aparecer na interface dos jogadores.**
