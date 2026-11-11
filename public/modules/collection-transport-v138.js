const fallbackCodes=new Set(['SOCKET_COLLECTION_UNAVAILABLE','SOCKET_COLLECTION_TIMEOUT','SOCKET_COLLECTION_DISCONNECTED']);
// Both transports carry the same durable command id and reach the same server handler.
export async function collectWithFallbackV138(socket,http,{drop_id,request_id,collector}){
 if(socket?.collectionV138&&socket.isOnline()){
  try{return await socket.collectDropV138({drop_id,request_id,collector});}
  catch(error){if(!fallbackCodes.has(error?.code))throw error;}
 }
 return http(drop_id,request_id,collector);
}
export function collectionTargetAvailableV138(drop,pending,now=Date.now()){
 return !!drop?.id&&!pending.has(drop.id)&&now>=Number(drop.retryAtV134||0);
}
