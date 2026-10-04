-- Stellar Legacy V16.6.1
-- Catálogo expandido de eventos em modo DORMANT.
-- Nenhum novo evento fica ativo automaticamente: enabled = false.

insert into public.live_event_config_v16
(event_key,name,icon,description,enabled,starts_at,duration_minutes,repeat_minutes,priority,target,reward,rules)
values
  ('eclipse_surge','SURTO ECLIPSE','☾','Caçada especial com inimigos reforçados na rota Eclipse.',false,now(),60,10080,210,1,'{}'::jsonb,'{"normal_only":true,"min_tier":2,"theme":"eclipse","drop_pool":"drone_damage"}'::jsonb),
  ('nexus_breach','RUPTURA NEXUS','✹','Rota de pressão com NPCs raros e foco em combate pesado.',false,now(),60,10080,220,1,'{}'::jsonb,'{"normal_only":true,"min_tier":2,"theme":"nexus","drop_pool":"drone_shield"}'::jsonb),
  ('relic_hunt','CAÇADA RELIC','⌬','Alvos raros espalhados pelo universo com recompensa de designer.',false,now(),60,10080,230,1,'{}'::jsonb,'{"normal_only":true,"min_tier":2,"theme":"relic","drop_pool":"ship_aux_designers"}'::jsonb),
  ('quantum_storm','TEMPESTADE QUÂNTICA','⚡','Anomalias quânticas aumentam a tensão e os spawns temporários.',false,now(),60,10080,240,1,'{}'::jsonb,'{"normal_only":true,"min_tier":1,"theme":"quantum"}'::jsonb),
  ('shadow_fleet','FROTA DAS SOMBRAS','☠','Frota hostil de elite atravessa os setores e exige resposta coordenada.',false,now(),60,10080,250,1,'{}'::jsonb,'{"normal_only":true,"min_tier":3,"theme":"shadow"}'::jsonb),
  ('aux_uprising','UPRISING AUX-9','⚙','Evento voltado a drops e progressão do AUX-9.',false,now(),60,10080,260,1,'{}'::jsonb,'{"normal_only":true,"min_tier":2,"theme":"aux"}'::jsonb),
  ('titan_assault','ASSALTO TITAN','♛','Boss raid especial para clãs e grupos.',false,now(),60,10080,270,1,'{}'::jsonb,'{"normal_only":true,"min_tier":4,"theme":"titan"}'::jsonb),
  ('ore_frenzy','FRENESI ORE','⬡','Janela especial de recursos e mineração acelerada.',false,now(),60,10080,280,1,'{}'::jsonb,'{"normal_only":true,"min_tier":1,"theme":"ore"}'::jsonb)
on conflict (event_key) do update
set name=excluded.name,
    icon=excluded.icon,
    description=excluded.description,
    enabled=false,
    starts_at=excluded.starts_at,
    duration_minutes=excluded.duration_minutes,
    repeat_minutes=excluded.repeat_minutes,
    priority=excluded.priority,
    target=excluded.target,
    reward=excluded.reward,
    rules=excluded.rules;
