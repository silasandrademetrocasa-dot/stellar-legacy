import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const from=source.indexOf('let auxFoldSequenceV18210=0;');
const until=source.indexOf('function renderPet(',from);
assert(from>0 && until>from,'Expected fold helper in game client');
const script=source.slice(from,until);
class FakeElement {
  constructor(tag){this.tagName=tag;this.className='';this.children=[];this.attributes={};this._parent=null;this.textContent='';this.type='';this.onclick=null;}
  get firstChild(){return this.children[0]??null;}
  append(...elems){elems.forEach(e=>this.appendChild(e));}
  appendChild(el){if(el._parent){const siblings=el._parent.children;siblings.splice(siblings.indexOf(el),1);}this.children.push(el);el._parent=this;return el;}
  get classList(){const node=this;return {
    add(name){const vals=new Set(node.className.split(' ').filter(Boolean));vals.add(name);node.className=[...vals].join(' ');},
    contains(name){return node.className.split(' ').includes(name);},
    toggle(name,value){const vals=new Set(node.className.split(' ').filter(Boolean));const active=value===undefined?!vals.has(name):!!value;if(active)vals.add(name);else vals.delete(name);node.className=[...vals].join(' ');return active;}
  };}
  setAttribute(k,v){this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k];}
}
const prefs={loaded:true,collapsed:{}};let saves=0;
const runtime=vm.runInNewContext(`${script};({auxFoldSectionV18210})`,{
  document:{createElement:tag=>new FakeElement(tag)},
  hangarUiPrefs:prefs,loadHangarEquipmentPrefs:()=>{},saveHangarEquipmentPrefs:()=>{saves++},
  String
});
const sectionOne=new FakeElement('div');const oldButton=new FakeElement('button');oldButton.textContent='Modo mineração';sectionOne.append(oldButton);
const folded=runtime.auxFoldSectionV18210(sectionOne,'aux:modes','MODOS / EXTRAS DO AUX-9','Ativo: EXTRATOR • 3/5 módulos');
assert(folded.classList.contains('is-collapsed'),'First visit should be compact');
assert.equal(folded.children.length,2,'header + content');
const [head,body]=folded.children;
assert.equal(head.tagName,'button');assert.equal(head.type,'button');
assert.equal(head.getAttribute('aria-expanded'),'false');
assert.equal(head.getAttribute('aria-controls'),body.id);
assert.equal(head.children[0].children[1].textContent,'Ativo: EXTRATOR • 3/5 módulos');
assert.equal(body.children[0].children[0],oldButton,'Existing mode action must be preserved');
head.onclick();assert.equal(head.getAttribute('aria-expanded'),'true');
assert(!folded.classList.contains('is-collapsed'));
assert.equal(prefs.collapsed['aux:modes'],false);
assert.equal(saves,1);
head.onclick();assert.equal(head.getAttribute('aria-expanded'),'false');
assert.equal(prefs.collapsed['aux:modes'],true);
assert.equal(saves,2);
head.onclick();assert.equal(prefs.collapsed['aux:modes'],false);
// Simulate modal switch, Hangar re-render and local preference restored.
const reloaded=runtime.auxFoldSectionV18210(new FakeElement('div'),'aux:modes','MODOS / EXTRAS DO AUX-9','Ativo: SENTINELA');
assert.equal(reloaded.children[0].getAttribute('aria-expanded'),'true');
assert(!reloaded.classList.contains('is-collapsed'));
// Independent sections, default closed.
const designer=runtime.auxFoldSectionV18210(new FakeElement('div'),'aux:designers','DESIGNERS AUX-9','Ativo: SEM DESIGNER');
assert(designer.classList.contains('is-collapsed'));
assert.equal(designer.children[0].getAttribute('aria-expanded'),'false');
assert.notEqual(designer.children[1].id,reloaded.children[1].id,'Unique accessible ids');
assert(source.includes("auxFoldSectionV18210(designerPanel,'aux:designers'"));
assert(source.includes("auxFoldSectionV18210(gears,'aux:modes'"));
assert(css.includes('.aux-fold-section.is-collapsed .aux-fold-body'));
assert(css.includes('grid-template-rows:0fr'));
assert(css.includes('prefers-reduced-motion'));
assert(html.includes('/game.js?v=20.1.4'));
assert(html.includes('/style.css?v=20.1.4'));
console.log('PASS V18.2.10: default collapsed, independent toggles, persisted preference, active summary, accessible controls, existing mode actions and CSS transition.');
