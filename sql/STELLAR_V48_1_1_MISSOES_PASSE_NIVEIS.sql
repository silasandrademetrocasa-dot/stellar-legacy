-- STELLAR LEGACY V48.1.1 • EXECUTAR SOMENTE DEPOIS DO TESTE DE FARM.
-- Compatível com tabelas atuais de UI e categorias de missões (confirmadas no projeto).
-- NÃO muda saves, saldos, recompensas, moedas ou conquistas existentes.
BEGIN;
DO $guard$
BEGIN
 IF (SELECT COUNT(*) FROM public.game_mission_category_v1815 WHERE category IN ('daily','weekly','monthly','special'))<>4 THEN
    RAISE EXCEPTION 'V48.1.1: catálogo de categorias incompleto; operação cancelada';
 END IF;
 IF (SELECT COUNT(*) FROM public.game_ui_modules_v1810 WHERE module_key IN ('missions_menu','missions','pass'))<>3 THEN
    RAISE EXCEPTION 'V48.1.1: módulos de menu incompletos; operação cancelada';
 END IF;
END $guard$;
UPDATE public.game_mission_category_v1815
SET min_level=CASE category
  WHEN 'daily' THEN 3
  WHEN 'weekly' THEN 5
  WHEN 'monthly' THEN 7
  WHEN 'special' THEN 10 END,
 updated_at=now()
WHERE category IN ('daily','weekly','monthly','special')
 AND min_level IS DISTINCT FROM CASE category
  WHEN 'daily' THEN 3
  WHEN 'weekly' THEN 5
  WHEN 'monthly' THEN 7
  WHEN 'special' THEN 10 END;
UPDATE public.game_ui_modules_v1810
SET min_level=1
WHERE module_key IN ('missions_menu','missions','pass') AND min_level<>1;
COMMIT;
-- CONFERÊNCIA após aplicação:
SELECT category,min_level FROM public.game_mission_category_v1815
WHERE category IN ('daily','weekly','monthly','special') ORDER BY min_level;
SELECT module_key,min_level FROM public.game_ui_modules_v1810
WHERE module_key IN ('missions_menu','missions','pass') ORDER BY module_key;
