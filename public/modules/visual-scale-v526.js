/* Stellar Legacy V52.6 — tamanho de renderização e convenção angular.
 * Não modifica: física, colisão, alcance, dano, coleta, propriedades nem economia.
 * 0 rad = leste (+X); PI/2 = sul (+Y de tela), igual ao movimento do jogador.
 */
export const modelYawFromHeadingV526 = angle => Math.PI / 2 + (Number.isFinite(Number(angle)) ? Number(angle) : 0);
export const npcDisplaySizeV526 = (radius, isBoss=false) => {
  const r=Math.max(1, Number(radius)||16);
  // Bosses já estão grandes; preservar exatamente o tamanho de antes.
  return isBoss?r*3.45:Math.max(76, Math.min(126, r*3.65));
};
export const oreDisplaySizeV526 = (radius, mode='3d') => {
  const r=Math.max(1,Number(radius)||7);
  return mode==='2d'?Math.max(44,r*4.2):Math.max(49,r*4.8);
};
export const boxDisplaySizeV526 = low => low?56:62;
export const lootDisplaySizeV526 = pulse => 62*(Number.isFinite(Number(pulse))?Number(pulse):1);
/* Cada GLB tem escala geométrica diferente; normalizar o ENQUADRAMENTO
 * dentro da miniatura offscreen, sem alterar o tamanho físico no jogo. */
export const modelZoomFactorV526 = (id, visualSpan) => {
  // Frota e Bosses já têm leitura adequada; preservar sua presença visual.
  if(['phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo'].includes(id)||String(id).startsWith('npc_boss'))return 1;
  const extent=Math.max(.1, Number(visualSpan)||1);
  // V53 estruturas largas: reduzir zoom quando GLB extrapola o enquadramento 3D.
  if(/^(?:portal_|astral_|base_|drone_)/.test(String(id)))return Math.max(.28,Math.min(3.4,4.25/extent));
  return Math.max(1,Math.min(3.4,5.5/extent));
};
