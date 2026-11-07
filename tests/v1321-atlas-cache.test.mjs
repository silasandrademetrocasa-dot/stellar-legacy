import test from 'node:test';
import assert from 'node:assert/strict';
import {versionedAssetUrl} from '../public/modules/asset-cache.js';
test('atlas image addresses remain byte-for-byte intact',()=>{
 for(const url of ['data:image/png;base64,aGVsbG8=','blob:https://example.test/abc'])assert.equal(versionedAssetUrl(url),url);
 assert.match(versionedAssetUrl('/assets/v132/elite.png'),/asset=/);
});
