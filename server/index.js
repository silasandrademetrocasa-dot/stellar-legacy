import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const app=express(); const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(express.json()); app.use(express.static(path.join(__dirname,'../public')));
app.get('/health',(req,res)=>res.json({ok:true,game:'Stellar Legacy'}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));
const port=process.env.PORT||3000; app.listen(port,()=>console.log(`Stellar Legacy :${port}`));
