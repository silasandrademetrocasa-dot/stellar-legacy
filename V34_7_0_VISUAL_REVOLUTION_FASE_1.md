# Stellar Legacy V34.7.0 — Visual Revolution, fase 1

Primeiro lote: otimização do painel de munições + propulsores leves no modo gráfico baixo.

- O HUD aberto atualiza quantidades em lotes de até ~580 ms no mobile, sem alterar combate, munições reais ou recarga.
- Botões com quantidades idênticas não reescrevem atributos nem tooltips; seleção e atalhos atualizam imediatamente.
- Esconder o painel suspende a atualização visual. Reabrir reconcilia imediatamente o inventário.
- Removidos blur e animações contínuas custosas no HUD de armas mobile, com destaque de seleção estático.
- Naves e outros pilotos têm rastros leves de propulsor na qualidade baixa; sem efeitos de blur nem gradientes extras.
- Preservados os sistemas de relés, clãs, equipamentos, eventos, saves, SQL e instalador do GitHub.

Instalação: subir ZIP pelo instalador universal; não requer SQL. Sem alterar produção automaticamente.
Próximas etapas V34.7: refinamento de sprites, efeitos dos relés, efeitos do mapa e medição de FPS em gameplay real.
