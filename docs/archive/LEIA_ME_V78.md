# Stellar Legacy V78 — efeitos leves e seleção circular

Base exigida: V77 (`47.7.33`). Nova versão: `47.7.34`. Use o Instalador Universal.

## Modificações (somente desenho)
- Laser (nave, pet, drones e remoto): uma linha no celular, sem `lighter` nem sombra; no desktop Alto, até duas linhas.
- Mísseis: sem gradientes radiais, sem halos e sem linhas de trilha duplicadas; limites de projéteis visuais por modo.
- Regeneração de escudo/vida: anel de baixo custo, sem quatro bolinhas orbitais, shadowBlur, gradientes ou sobreposições; cura/dano calculados como antes.
- Impactos no celular e Médio: desenhos simplificados de uma passada.
- Relés: círculo completo do alcance VISUAL (mesmo raio lógico), seleção circular, removida a letra branca A/B/C no topo.
- NPCs/jogadores remotos: retículo circular sem tracejados ou quatro cantoneiras por quadro.

O jogo mantém o sistema de isolamento V75 e render seguro V76/V77 em qualquer qualidade. Nenhuma mudança de regras, combate, captura, dados persistidos, Supabase ou backend.

## Teste no Motorola
1. Limpe/atualize a página e confirme a versão `47.7.34`.
2. No mesmo mapa e orientação, teste Baixo, Médio e Alto durante 60 segundos perto do relé, selecionando um NPC e atacando.
3. Verifique se o HUD, a nave, o alvo, os contadores de cura e o laser permanecem visíveis; confira se o anel de captura está completo e a letra A saiu.
4. Envie o relatório de desempenho e diga se ainda existe piscada ou desaparecimento de entidades.

**Aviso:** o FPS real do aparelho não é mensurado pelos testes automatizados. Nenhuma garantia de 30 FPS antes do teste no dispositivo.
