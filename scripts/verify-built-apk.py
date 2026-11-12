#!/usr/bin/env python3
"""Verify every shipped web resource against the actual assembled APK, not just the source tree."""
import argparse, hashlib, json, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def verify(apk, manifest):
    report = json.loads(manifest.read_text(encoding='utf-8'))
    expected = {entry['path']: entry for entry in report['entries']}
    if len(expected) != report['files']:
        raise ValueError('Inventário inconsistente')
    with zipfile.ZipFile(apk) as package:
        names = package.namelist()
        if len(names) != len(set(names)):
            raise ValueError('APK tem entradas duplicadas')
        actual = {name[7:] for name in names if name.startswith('assets/') and not name.endswith('/')}
        if actual != set(expected):
            raise ValueError(f'Arquivos locais divergentes: faltam {sorted(set(expected)-actual)[:10]}; extras {sorted(actual-set(expected))[:10]}')
        for name, entry in expected.items():
            data = package.read('assets/' + name)
            if len(data) != entry['size'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
                raise ValueError('Recurso truncado ou alterado no APK: ' + name)
    result = {'apk': apk.name, 'release': report['release'], 'files': len(expected),
              'bytes': report['bytes'], 'verified': True,
              'apk_sha256': hashlib.sha256(apk.read_bytes()).hexdigest()}
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('--manifest', type=Path, default=ROOT/'android/build/reports/stellar-assets-manifest.json')
    args = parser.parse_args()
    try:
        result = verify(args.apk, args.manifest)
    except (ValueError, KeyError, OSError, zipfile.BadZipFile) as error:
        parser.exit(1, 'APK reprovado: ' + str(error) + '\n')
    output = ROOT/'android/build/reports'/('verified-' + args.apk.stem + '.json')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(f"APK validado: {result['files']} recursos locais; SHA-256 confere em todos os arquivos.")
