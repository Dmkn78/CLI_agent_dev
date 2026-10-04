#!/usr/bin/env python3
"""Attach the mobile gateway to an existing Atelier; never start a second backend."""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server.mobile_discovery import discover_services
from server.mobile_gateway import main as gateway_main


def main(argv=None):
    parser = argparse.ArgumentParser(description='Relier Atelier existant au téléphone', add_help=False)
    parser.add_argument('--backend')
    parser.add_argument('--list', action='store_true')
    args, gateway_args = parser.parse_known_args(argv)
    if '--help' in gateway_args or '-h' in gateway_args:
        print('Détection automatique du service existant. --list affiche les services locaux ; --backend URL choisit explicitement un service.')
        return gateway_main(gateway_args)
    if args.backend:
        if args.list:
            parser.error('--list et --backend sont incompatibles.')
        return gateway_main(['--backend', args.backend, *gateway_args])
    # Pair/revoke manage only the gateway key and do not require a running backend.
    if '--pair' in gateway_args or '--revoke' in gateway_args:
        return gateway_main(gateway_args)
    services = discover_services()
    if args.list or len(services) != 1:
        for service in services:
            print(service['url'] + ' — ' + service['workspace'] + (' (version installée)' if service.get('legacy') else ''))
        if args.list:
            return 0
        if not services:
            parser.error('Ouvre Atelier sur ce PC puis relance cette commande, ou précise --backend http://127.0.0.1:PORT.')
        parser.error('Plusieurs services Atelier sont ouverts. Précise --backend avec l’URL du service souhaité ci-dessus.')
    service = services[0]
    print('Connexion au service existant : ' + service['url'] + ' — ' + service['workspace'], flush=True)
    return gateway_main(['--backend', service['url'], *gateway_args])


if __name__ == '__main__':
    raise SystemExit(main())
