# STELLAR LEGACY V34.6.2 — RELAY HANGAR / INVENTÁRIO INDIVIDUAL

## Entrega
- Clicar no relé controlado pelo próprio clã no mapa PvP abre um **modal exclusivo de inventário e equipamento**, em vez de mostrar aviso e encerrar a interação.
- O clã também pode abrir o inventário a partir de **CLÃ → INVENTÁRIO DOS RELÉS**, mesmo que ainda não tenha conquistado um relé; isso permite fabricar e evoluir módulos antes da primeira conquista.
- Hangar individual com oito slots identificados, módulo equipado, nível, peças disponíveis, inventário integral de clã, catálogo compatível por slot e botões **EQUIPAR, TROCAR, REMOVER, EVOLUIR e FABRICAR**.
- Tipos distintos e não intercambiáveis: **ARMA 1 LASER** (cadência rápida), **ARMA 2 LANÇA-MÍSSEIS** (tiros mais fortes/cadência lenta), ESCUDO 1 CAPACITOR, ESCUDO 2 REGENERADOR, CASCO 1 BLINDAGEM, CASCO 2 NANORROBÔS e dois slots de bônus distintos (sem repetir atributo).
- Removidas as caixas genéricas de fabricar/equipar da aba BATALHA; visão geral e controles administrativos mantidos.
- Inventário reconsultado ao banco após operações, inclusive quando já existia uma atualização concorrente; o slot selecionado permanece.
- Um slot ocupado admite **troca atômica**, devolvendo o equipamento antigo ao inventário com seu nível preservado.
- Relés **sem clã proprietário** usam oito módulos de **defesa virtual LV1**, incluindo laser e mísseis; não geram itens grátis, recompensas, peças nem bônus globais.
- Os relés equipados passam a ter dois disparos de defesa independentes, condicionados à entrada de adversários na zona de combate; a zona segura permanece protegida.

## Ordem de instalação
1. Enviar o ZIP **completo**, sem substituir `.github`, pelo Instalador Universal do GitHub; aguardar Render **Live**.
2. **Depois** aplicar `sql/V34_6_2_RELAY_HANGAR_TYPED_MODULES.sql` no Supabase. **Este SQL não foi aplicado automaticamente**.
3. Verificar um módulo legado equipado na ARMA 1, testar fabricação de arma LASER LV1 e MÍSSEIS LV1; impedir equipamento cruzado, trocar um módulo no mesmo slot e confirmar que o anterior reaparece no inventário.
4. Testar um relé controlado, um relé sem clã e dois jogadores adversários dentro da zona de defesa. Confirmar em produção movimento, dano e FPS.

## Compatibilidade e segurança
- Preserva a propriedade dos 9 relés, facções, clãs, módulos existentes, níveis, inventário, economias, eventos e saves.
- O SQL converte categorias genéricas (`weapon`, `shield`, `hp`) nos tipos atuais, respeitando o slot equipado. Módulos soltos recebem o tipo básico da categoria.
- Validação de tipo/slot e não duplicidade de bônus ocorre **no PostgreSQL**, não apenas no menu.
- Fabricar/evoluir continua exigindo peças, créditos do cofre e nível mínimo do clã. Apenas o líder gasta recursos. Bônus e recompensas não são concedidos pelo navegador.
- `sql/V34_6_2_RELAY_HANGAR_ROLLBACK.sql` reverte o formato tipado se for preciso restaurar o código anterior (primeiro reverta o código, depois o SQL).
- Os efeitos de torretas seguem o protocolo de combate multiplayer já existente e devem ser validados com duas contas. Não foram alterados os saves ou o modelo autoritativo de posição das naves.
- Nenhum rótulo de versão é exibido nos novos painéis do jogo.
