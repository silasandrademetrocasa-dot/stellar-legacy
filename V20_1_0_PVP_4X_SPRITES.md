# Stellar Legacy V20.1.0 — PvP 4-X e sprites

- **PVP apenas b41/b42/b43 (4-1, 4-2, 4-3)**. X-1 a X-8 protegidos.
- Pilotos de qualquer faccao podem ser selecionados, exceto membro do mesmo grupo de batalha.
- Toque/clique na nave para LOCK; segundo toque rapido (com Tap Attack ligado) ou botao LASER dispara.
- Nova RPC SQL bloqueia ataques fora de 4-X, alvos offline, sem presenca, fora de alcance (~2200u com margem), dano >100.000 e cadencia <350ms.
- PVP continua enviando eventos de dano via Supabase; nao e um servidor de combate inteiramente autoritativo.
- Sprites originais individuais dos 4 itens raros e 4 escudos de evento, com fundo transparente.
- Instale ZIP completo usando workflow original e execute SQL uma unica vez, se ainda nao aplicado.
- Teste manual multiplayer: duas contas lv>=15 no mesmo 4-X; atacar; confirmar perda escudo e HP; sair X-3: ataques devem ser bloqueados.
