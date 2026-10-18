# Relatório — HUD compacto em todas as janelas
- Fonte: ZIP completo V22.9.3.
- Novos controles persistentes: Atividade, Portal Astral.
- Novos compactos estritos: Chat, Minimapa, Munições. Mantidos: Jogador, Nave, Missões, AUX-9, Eventos, Alvo.
- Área recolhida de cada uma das 9 janelas da seção CONF/Visibilidade: 40×40 px.
- Contextos especiais continuam ocultos quando não ativos.
- Testes: 324/324 aprovados; Chromium 390/680/1100 px e teste de `.hud-user-hidden` / `.hud-user-disabled`.
- Sem migração SQL e sem mutação de banco ou saves.
- Versão ainda não publicada no Render: depende de GitHub Actions.
