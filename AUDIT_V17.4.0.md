# AUDIT V17.4.0 — PERFORMANCE + MOBILE PASS

## Objetivo
Reduzir download, memória, GPU e consumo de bateria sem sacrificar a qualidade visual da V17.

## Mudanças principais
- Modo AUTO de qualidade com perfis ALTA / MÉDIA / BAIXA.
- Auto-downgrade/upgrade com janela de FPS e teto definido pelas capacidades do dispositivo.
- Preload inteligente e lazy-load de assets de gameplay.
- Cache limitado de imagens com política de uso recente.
- Assets V17 em WebP transparente.
- Loop de render suspenso quando a aba fica oculta.
- CSS específico para dispositivos móveis e reduced-motion.

## Compatibilidade
- Nenhuma alteração em save, Supabase, economia ou regras de combate.
- Manifesto mantém os mesmos IDs de naves, drones e equipamentos; somente os caminhos V17 mudaram de PNG para WebP.
