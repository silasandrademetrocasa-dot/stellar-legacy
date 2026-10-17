export function createSecurityService(serviceClient){
 const report=async (userId,finding,source='http')=>{
  if(!serviceClient||!userId||!finding)return {recorded:false,securityUnavailable:true};
  const evidence={...finding.evidence,source:String(source).slice(0,40)};
  try{
   const {data,error}=await serviceClient.rpc('stellar_security_report_server',{p_user_id:userId,p_code:finding.code,p_severity:finding.severity,p_context:evidence});
   if(error)throw error;
   if(data?.auto_suspended)console.warn('[security] suspension issued',{userId,code:finding.code});
   return data||{recorded:true};
  }catch(e){console.error('[security] audit failed',{code:finding.code,error:String(e?.message||e).slice(0,160)});return {recorded:false,securityUnavailable:true};}
 };
 return {report};
}
