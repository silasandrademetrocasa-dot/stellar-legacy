# Stellar Legacy V3 — Facções, Loja, Hangar e Progressão

A V3 transforma o protótipo em um loop de progressão completo: escolha de facção, nave inicial, loja, inventário, equipamentos, drones, munição consumível e troca real de naves.

## Primeiro acesso

O jogador escolhe uma das três facções:

- **Terra Alliance** → mapas 1-1 até 1-4
- **Mars Dominion** → mapas 2-1 até 2-4
- **Jupiter Federation** → mapas 3-1 até 3-4

O save começa com:

- Phoenix
- 0 drones
- 1x LF-1 equipado
- 1x SG3N-A01 equipado
- 10.000 LCB-10
- 100 R-310
- 20.000 créditos

## Sistema de naves

Cada nave tem sua própria capacidade de:

- lasers
- geradores (escudo ou velocidade)
- extras

Ao trocar de nave, **todos os equipamentos instalados na nave anterior voltam automaticamente para o inventário**. A nave nova entra vazia e você decide o que instalar nela.

As naves compradas ficam permanentemente em `ownedShips` e podem ser trocadas no Hangar.

## Loja

Categorias:

- Naves
- Lasers
- Geradores
- Drones
- Extras
- Munição laser
- Mísseis

A loja usa duas moedas:

- Créditos
- Uridium

## Equipamentos

### Lasers
LF-1, MP-1, SL-01, LF-2, LF-3 e LF-4.

O dano da nave é calculado pela soma dos lasers equipados na nave e nos drones.

### Geradores
Geradores de velocidade e escudo. O escudo total, absorção e velocidade são recalculados conforme a configuração.

### Extras

- Auto Laser CPU
- Auto Rocket CPU
- Rocket Turbo CPU
- Repair Bot REP-2

Os toggles de Auto Laser / Auto Míssil / Turbo Míssil só funcionam quando o respectivo CPU está realmente equipado em um slot de extra.

## Drones

Máximo de **8 drones**.

- **Flax**: comum, 1 slot
- **Iris**: elite, 2 slots

Os drones aceitam lasers ou geradores e permanecem equipados mesmo quando o jogador troca de nave.

## Combate

- CTRL: liga/desliga laser
- ESPAÇO: lança míssil
- B: Loja
- H: Hangar
- 1–4: troca munição laser

Munições e mísseis agora são consumíveis e precisam ser comprados.

Cooldown padrão do míssil: **5 segundos**.
Com Rocket Turbo CPU equipado e ativado: **2,5 segundos**.

## Save

A V3 usa `localStorage` para permitir jogar imediatamente mesmo sem login.
O arquivo `supabase/database.sql` já contém a estrutura preparada para sincronização futura de:

- perfil/facção
- estado do jogador
- naves obtidas
- inventário
- munição
- loadout da nave
- drones

## Render

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```
