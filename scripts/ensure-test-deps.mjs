// The existing ZIP installer runs npm test on a fresh checkout without npm install.
// Bootstrap locked test dependencies once; Render builds already have them installed.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
try{require.resolve('@electric-sql/pglite');require.resolve('fake-indexeddb');}
catch{
 console.log('Installing locked dependencies for SQL transaction tests.');
 execFileSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--include=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit'});
}
