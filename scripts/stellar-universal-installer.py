#!/usr/bin/env python3
"""Instalador universal Stellar Legacy: full, update, patch.
Sem executar scripts recebidos do ZIP.
"""
import json, os, re, shutil, stat, sys, tempfile, zipfile
from pathlib import Path, PurePosixPath

ROOT=Path(__file__).resolve().parent.parent
LIMIT=2*1024**3
MAX_FILES=12000
PROTECTED={'.git','.github','scripts/stellar-universal-installer.py'}
ESSENTIAL=['package.json','public/game.js','public/api.js','public/data.js','server/index.js']
def fail(msg): raise SystemExit('❌ '+msg)
def safe(path):
    p=PurePosixPath(path)
    if not path or '\\' in path or p.is_absolute() or '..' in p.parts or any(x in ('','.') for x in p.parts):
        fail(f'Caminho inválido: {path}')
    if re.match(r'^[A-Za-z]:',path): fail(f'Caminho absoluto: {path}')
    return p
def protected(path):
    p=str(path)
    return p=='.git' or p.startswith('.git/') or p=='.github' or p.startswith('.github/') or p=='scripts/stellar-universal-installer.py'
def is_payload(path):
    if path in ('stellar-install.json','README.md'): return False
    if path.startswith('__MACOSX/'): return False
    return True
def version_at(path):
    try: return str(json.loads((path/'package.json').read_text(encoding='utf8')).get('version',''))
    except Exception:return ''
def main():
    if len(sys.argv)!=2:fail('Uso: python scripts/stellar-universal-installer.py ARQUIVO.zip')
    zpath=(ROOT/sys.argv[1]).resolve()
    if zpath.parent!=ROOT or not zpath.is_file():fail('ZIP deve estar na raiz do repositório')
    with tempfile.TemporaryDirectory(prefix='stellar-install-') as temp:
        stage=Path(temp)
        with zipfile.ZipFile(zpath) as z:
            infos=z.infolist()
            if len(infos)>MAX_FILES:fail('ZIP tem arquivos demais')
            if sum(i.file_size for i in infos)>LIMIT:fail('ZIP expandido ultrapassa 2 GB')
            names=set()
            for i in infos:
                p=safe(i.filename.rstrip('/'))
                if str(p) in names:fail(f'Entrada duplicada: {p}')
                names.add(str(p))
                mode=(i.external_attr>>16)&0o170000
                if mode==stat.S_IFLNK:fail('Links simbólicos proibidos')
                if i.is_dir():continue
                dst=stage.joinpath(*p.parts)
                dst.parent.mkdir(parents=True,exist_ok=True)
                with z.open(i) as src, dst.open('wb') as out:shutil.copyfileobj(src,out)
        top=[p for p in stage.iterdir() if p.name!='__MACOSX']
        source=stage
        if len(top)==1 and top[0].is_dir():source=top[0]
        mf=source/'stellar-install.json'
        spec={}
        if mf.exists():
            try:spec=json.loads(mf.read_text(encoding='utf8'))
            except Exception:fail('Manifesto stellar-install.json inválido')
        mode=spec.get('type','').lower()
        has_full=all((source/p).is_file() for p in ESSENTIAL)
        if not mode:mode='full' if has_full else 'patch'
        if mode not in ('full','update','patch'):fail('Tipo desconhecido: '+mode)
        if mode=='full' and not has_full:fail('ZIP completo sem arquivos essenciais')
        if not isinstance(spec.get('delete',[]),list):fail('delete deve ser uma lista')
        base=spec.get('baseVersion')
        if base and version_at(ROOT)!=str(base):fail(f'Versão base divergente: esperado {base}; atual {version_at(ROOT)}')
        # Existing path, including symlinks, never allowed as parent/destination.
        entries=[]
        for f in source.rglob('*'):
            if not f.is_file():continue
            rel=f.relative_to(source).as_posix()
            if not is_payload(rel):continue
            if protected(rel):fail(f'Arquivo protegido no ZIP: {rel}')
            entries.append((f,rel))
        deleted=[]
        for rel in spec.get('delete',[]):
            if not isinstance(rel,str):fail('delete requer caminhos texto')
            safe(rel)
            if protected(rel) or rel in ESSENTIAL:fail('Remoção protegida: '+rel)
            deleted.append(rel)
        if mode=='full':
            keep={'stellar-install.json','README.md','.gitignore'}
            incoming={r for _,r in entries}
            for parent in ('public','server','sql','tests'):
                directory=ROOT/parent
                if not directory.exists():continue
                for old in directory.rglob('*'):
                    if old.is_file():
                        rel=old.relative_to(ROOT).as_posix()
                        if rel not in incoming and not protected(rel):deleted.append(rel)
        # Refuse writes through preexisting symbolic links.
        for rel in [r for _,r in entries]+deleted:
            path=ROOT/rel
            for x in [path,*path.parents]:
                if x==ROOT.parent:break
                if x.is_symlink():fail('Link simbólico no destino: '+str(x))
        count=0
        for rel in sorted(set(deleted),key=len,reverse=True):
            p=ROOT/rel
            if p.is_file():p.unlink();count+=1
        for src,rel in entries:
            p=ROOT/rel
            p.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(src,p)
        zpath.unlink()
        if any(not (ROOT/p).is_file() for p in ESSENTIAL):fail('Arquivos essenciais faltando após instalação')
        expected=spec.get('version')
        if expected and version_at(ROOT)!=str(expected):fail('Versão de destino não coincide com package.json')
        print(f'✅ Tipo: {mode.upper()} | Arquivos aplicados: {len(entries)} | removidos: {count} | Versão: {version_at(ROOT)}')
if __name__=='__main__': main()
