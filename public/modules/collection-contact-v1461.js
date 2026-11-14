/** Observe contact before any IndexedDB wait. The event remains durable; rewards remain authoritative. */
export async function queueDropAtContactV1461({drop,collector,contact,observe,enqueue,attach,randomId=()=>crypto.randomUUID()}){
 const observationId=randomId(),snapshot=structuredClone(contact||{});
 let observation;
 try{observation=Promise.resolve(observe({drop_id:drop.id,collector,request_id:observationId,contact:snapshot}));}
 catch(error){observation=Promise.reject(error);}
 // Handle rejection immediately, even while a slow disk transaction is still running.
 const observed=observation.then(proof=>({proof}),error=>({error}));
 const event=await enqueue('collection',{drop_id:drop.id,collector,proof:null},{drop:structuredClone(drop),fromPet:collector==='pet',observationId,contact:snapshot});
 void observed.then(result=>result.proof?attach(event.id,result.proof):undefined).catch(()=>{});
 return event;
}
