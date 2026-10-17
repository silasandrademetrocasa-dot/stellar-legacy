// V21.3 — Estado de temporada e prestígio cosmético, sem nova economia.
function int(n,defaultValue=0){const v=Number(n);return Number.isFinite(v)?Math.max(0,Math.floor(v)):defaultValue;}
export function deriveSeasonBriefing({season={},tier=0,tierCount=30,points=0,achievements=0,totalAchievements=11,active=false}={}){
 const max=Math.max(1,int(tierCount,30));const current=Math.min(max,int(tier));
 const total=Math.max(1,int(totalAchievements,11));const done=Math.min(total,int(achievements));
 const title=done>=total?'LENDA ESTELAR':done>=7?'ÁS GALÁCTICO':done>=3?'VETERANO':'RECRUTA ESTELAR';
 return {name:String(season?.name||'TEMPORADA ATUAL'),key:String(season?.season_key||'—'),
  active:!!active,tier:current,tierCount:max,points:int(points),tierPercent:Math.round(current/max*100),
  achievements:done,totalAchievements:total,achievementPercent:Math.round(done/total*100),prestigeTitle:title,
  startedAt:season?.starts_at||null,endsAt:season?.ends_at||null};
}
