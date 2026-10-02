# V10.6.7 — Target Cleanup

- Corrigida a barra horizontal que aparecia abaixo do menu superior.
- A causa era uma regra CSS antiga que transformava o `#toast` em elemento de layout.
- Selecionar NPC não mostra mais `Alvo: ...` como toast.
- Selecionar jogador PvP também não abre mais toast de alvo.
- Essas informações agora entram somente no painel ATIVIDADE.
- Outros avisos importantes continuam usando toast flutuante pequeno.
- O antigo `targetPanel` permanece permanentemente oculto.
