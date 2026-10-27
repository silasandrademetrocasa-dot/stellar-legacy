# Stellar Legacy — V77 | Relés seguros em todos os modos

Base **V76 47.7.32**; destino **V77 47.7.33**.

O caminho protegido dos relés que na V76 só era usado em Médio móvel agora passa a valer em **Baixo, Médio, Alto e Auto**, tanto no celular como no desktop. Um relé com falha de textura aciona fallback em vez de impedir que a nave seja desenhada.

Sem alterações na lógica de captura, posição, HP, escudo, alcance, combates, multiplayer ou Supabase. O desenho visual mais leve será usado também no modo Alto — medida temporária para priorizar estabilidade.

**Teste:** próximo ao mesmo relé, teste primeiro no Baixo e depois no Médio, 60 segundos cada, registrando FPS e se a nave/controles permanecem visíveis. Depois copie o diagnóstico. No A/B V75, o teste sem relés continua disponível. Não há garantia de FPS: sem relés a referência anterior foi 14–17 FPS.

Se estiver ainda na V75, você pode instalar a V76 REVISADA (47.7.31 → 47.7.32) e depois esta V77. Se já instalou a V76 anterior, aplique apenas esta V77. O rollback V77 → V76 anterior restaura o comportamento anterior.
