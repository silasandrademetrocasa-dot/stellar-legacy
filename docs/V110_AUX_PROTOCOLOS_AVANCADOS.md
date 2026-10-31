# STELLAR LEGACY V110.0 — PROTOCOLOS AVANÇADOS DO AUX-9

## Base e distribuição
Pacote **somente modificações**, para aplicar **por cima da V109.2**, que por sua vez depende da V109.1. Não substitui o jogo completo. A pasta de artes `/public/assets/v109/aux-protocols/` com os **15 PNGs aprovados** já faz parte da V109.1; este pacote reutiliza esses assets e não os duplica.

**Instalar pelo Instalador Universal e publicar Web + Render juntos.** O servidor precisa da nova rota de ação econômica (dentro da `/api/economy/action`). Sem atualizar o Render, a UI rejeitará compras/crafts com `Ação econômica não reconhecida`. Nenhuma migração SQL é necessária nesta fase: usa `game_saves.state` JSON já existente. Nenhuma publicação automática foi executada.

## Conteúdo
- Mantém as cinco especializações AUX existentes **GUARDA / MINERAÇÃO / SALVAGER / REPARAÇÃO / NOVA BURST** (distribuição gratuita de pontos) e as CONF globais da V109.1.
- Ativa cinco **famílias de protocolos de inventário** independentes: **DANO, HP, ESCUDO, BOX/LOOT e PORÃO**.
- Cada família possui N1/N2/N3, com arte dedicada: 15 protocolos visuais, um equipamento por família.
- Seleção per-CONF: o jogador compra/crafta o nível para a **conta**, mas pode **equipar/desquipar em cada CONF**. Não duplica item ao alternar; os níveis de propriedade não são contados como itens vendáveis.
- Slots avançados: AUX nível 1 = 1; nível 5 = 2; nível 9 = 3; nível 13 = 4; nível 17 = 5. São **separados dos pontos das especializações legadas**, que continuam conforme a progressão atual.
- Loja no hangar de protocolos para N1; fabricação N2 no hangar da base; fabricação N3 disponível nos mapas do Universo U-1, U-2, U-3 (com recursos de crafting).

## Balanceamento inicial (custos por família)
| Nível | Requer AUX | Custo | Recursos | Onde |
|---|---|---|---|---|
| I | 1 | 1.800 STL | — | Base própria X-1/X-8 |
| II | 8 | 3.500.000 CR | 65 Ferrite (`Prometid`), 45 Duracite (`Duranium`), 4 Solarium (`Promerium`) | Base própria X-1/X-8 |
| III | 15 | 16.000.000 CR | 160 Ferrite, 120 Duracite, 18 Solarium, 8 Voidite (`Xenomit`) | Universo U-1/U-2/U-3 |

Não existe compra N2/N3 usando STL; não são concedidos automaticamente por derrotar NPCs. **Drops de evento e receitas configuráveis por ADM continuam fora desta V110**.

## Bônus por nível
| Família | N1 | N2 | N3 | Alcance |
|---|---|---|---|---|
| Dano | +1% | +2% | +3% | Laser PvE do AUX, não armas da nave nem dano PvP |
| HP | +1% | +2,5% | +5% | HP máximo da nave via suporte do AUX |
| Escudo | +2% | +4% | +7% | Escudo contribuído pelo AUX à nave |
| BOX/LOOT | +1% | +4% | +7% | Quantidades das caixas bônus individuais; **não** multiplica pagamentos NPC/drops com RPC |
| Porão | +5% | +10% | +15% | Capacidade de carga local, usando multiplicador após bônus de EXTRA/skill |

HP/escudo aumentam máximos; **equipar ou trocar CONF não cura HP nem regenera escudo gratuitamente**.

## Segurança e persistência
1. Ações `aux_protocol_buy`, `aux_protocol_craft`, `aux_protocol_equip` percorrem `/api/economy/action` com autenticação, proteção contra Farm Offline, lock por usuário e gravação controlada de `game_saves` com incremento da revisão econômica.
2. Render determina preço, saldo, materiais, nível do AUX, local de compra e progressão da família. O navegador não envia custo, loot ou propriedade.
3. `/api/save` compara a propriedade paga recebida à propriedade confirmada no save do servidor; recusa aumento de nível ou alterações de seleção inválidas, excesso de slots ou divergência com a CONF ativa.
4. `hangar-write-guard-v1062` passa a incluir a seleção avançada; `hangar-save-recovery-v109` restaura configurações sem inventar equipamentos.
5. A interface de economia reconhece como legítimas as três atualizações de protocolos já confirmadas pelo servidor, sem ignorar o bloqueio para outras ações.
6. Nenhum novo processo WebSocket, timer ou consulta SQL por frame foi introduzido.

**Limitação de implantação:** operações de economia são consistentes com as rotas existentes e a trava por usuário do Render; não representam uma transação SQL única distribuída entre todas as tabelas do sistema. Valide em conta de testes e faça backup do estado antes de usar produção.

## Teste de homologação
- Na própria base X-1, com AUX habilitado: abrir **HANGAR → AUX → PROTOCOLOS**. Ver os cinco cards e a barra de slots e manter as especializações antigas intactas.
- Comprar N1 (1.800 STL), verificar que o nível passou ao inventário mas **não foi equipado automaticamente**. Equipar e verificar stat; repetir compra N1 deve ser recusado (não cobra duas vezes).
- Com AUX nível 8+, fabricar N2 e validar desconto dos três materiais e dos CR; fabricar N3 na base deve falhar.
- No Universo, com AUX nível 15+, fabricar N3 e conferir custo, recursos e arte de N3. Confirmar que equipamento não é modificado nesse mapa.
- Montar CONF 1 com DANO e CONF 2 com HP. Trocar CONF e conferir efeitos sem duplicação ou reset de HP/escudo; persistência após sair/relogar.
- Testar erro de rede no momento da compra/craft: conferir saldo/nível no servidor antes de clicar outra vez.
- Validar perfis Baixo/Médio/Alto e mobile; conferir se imagem e botão cabem dentro dos cards sem recorte.

## Verificações realizadas
- `npm run check`: imports, scripts, HTML e assets verificados sem erro.
- `npm test`: **307/307 testes locais passaram**.
- Não houve validação visual no dispositivo, chamada real ao Supabase ou deploy no Render nesta sessão.
