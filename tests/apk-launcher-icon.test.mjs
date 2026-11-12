import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='android/app/src/main/';
const read=p=>readFileSync(new URL('../'+root+p,import.meta.url));
test('APK launcher resolves Christmas artwork for normal, round and adaptive launchers',()=>{
 const manifest=read('AndroidManifest.xml').toString();
 assert.match(manifest,/android:icon="@mipmap\/ic_launcher"/);
 assert.match(manifest,/android:roundIcon="@mipmap\/ic_launcher"/);
 for(const dir of ['mipmap-anydpi','mipmap-anydpi-v26']){
  assert.match(read(`res/${dir}/ic_launcher.xml`).toString(),/android:src="@drawable\/stellar_icon"/);
 }
 const adaptive=read('res/mipmap-anydpi-v26/ic_launcher.xml').toString();
 assert.match(adaptive,/<adaptive-icon/);assert.match(adaptive,/<foreground>/);
 assert.match(adaptive,/@color\/stellar_launcher_background/);
 assert.match(read('res/values/colors.xml').toString(),/name="stellar_launcher_background"/);
 const png=read('res/drawable-nodpi/stellar_icon.png');
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);
 assert.ok(png.length>20000,'launcher cannot be the old small placeholder');
});
