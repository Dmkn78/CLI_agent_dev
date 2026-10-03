# Prisme

Dépose un cours. Explore ses concepts à gauche, lis le cours à droite et
reconstruis ses démonstrations à ton rythme.

## Ouvrir

Sous Windows, double-clique sur **Prisme.cmd**. Ou, depuis ce dossier :

```powershell
python -B run.py --open
```

Prisme écoute uniquement sur `http://127.0.0.1:8731`. Python 3.10 ou plus est
nécessaire. Pour les PDF et les images, si les bibliothèques manquent :

```powershell
python -m pip install -r requirements.txt
```

Déplace ce dossier entier où tu veux : aucun composant d'Atelier n'est importé.
Les sources, les cours, les preuves et les réponses sont dans `.prisme/`, privé,
ignoré par Git. Garde ce dossier caché si tu déplaces ta bibliothèque.

## Créer un parcours

1. Dépose des PDF, scans, photos, images, fichiers texte ou Markdown.
2. Les originaux sont conservés et les pages analysées localement. Un PDF avec
   des images ou des dessins vectoriels est lu visuellement ; les scans sont
   rendus en PNG. La numérotation source est conservée.
3. Connecte le Codex CLI installé sur ta machine, choisis son modèle et son
   effort, puis crée le parcours. Si son compte n'est pas connecté, utilise
   `codex login` dans ton terminal et actualise la connexion.
4. Le cours défile à droite. À gauche, l'expérience reste à la même place et
   change uniquement au passage à une autre section. Les preuves et corrections
   peuvent être ouvertes progressivement.
5. Télécharge le document HTML autonome ou l'archive avec les originaux.

Ton modèle reçoit les sources uniquement lorsque tu lances la création. Aucun
compte, jeton ou fichier de credentials n'est copié par Prisme. `model/list`
fournit le catalogue réel, avec pagination ; aucun modèle n'est figé dans l'app.
Le choix lecture seule / écriture du dossier du cours et `on-request` restent
explicites. La connexion au compte est gérée par Codex.

## Apprendre

Une prédiction, un paramètre, un effet visible et le symbole correspondant :
c'est le cœur d'une expérience. Les réponses et notes sont enregistrées. Prisme
ne déduit pas une maîtrise d'un clic ou d'une lecture. Les rappels indiqués
reposent sur tes auto-évaluations, identifiées comme telles.

Les préférences sont modifiables : intuition, dérivations, blocages déclarés,
objectif et applications. Le lien finance/IA n'est ajouté que s'il aide à
comprendre. Une 3D n'est pas exigée quand une autre manipulation est plus utile.

Le parcours intégré sert uniquement à essayer l'interface. Il ne constitue pas
ta bibliothèque et ne lance aucune génération.

## Périmètre actuel

- Jusqu'à 12 fichiers, 25 Mo chacun, 40 Mo au total, 100 pages par cours.
- Lots bornés pour conserver chaque page sans tronquer silencieusement un gros
  document. Une page illisible doit être signalée par le modèle.
- Les expériences spécifiques sont des HTML isolés dans une iframe, sans
  accès au parent, au stockage ou au réseau. Elles n'exécutent pas de commandes
  sur ta machine. Leur justesse pédagogique et numérique reste à relire.
- Les sections et leurs références sont contrôlées avant d'enregistrer le
  cours. Ce contrôle de structure n'est pas une certification mathématique.
- Pas de téléchargement de vidéos, d'OCR autonome hors modèle ou d'import
  Office dans cette version. Une transcription texte peut être importée.
- Les sources survivent à une génération interrompue ou ratée. Une ancienne
  édition est sauvegardée avant remplacement. Une création interrompue par un
  redémarrage est identifiée et peut être relancée volontairement.

## Vérifier

```powershell
python -B -m unittest discover -s tests -v
node --test tests/test_simulations.mjs
```

Les tests utilisent un fournisseur fictif ; aucune inférence réelle n'est
lancée pour remplir l'interface. Voir `docs/audit/2026-10-02-prisme.md` pour les
contrôles et limites effectivement observés.

## Architecture

`run.py` démarre un service Python local. `prisme/ingestion.py` conserve et
prépare les sources ; `generation.py` orchestre les lots ; `codex_client.py`
adapte le protocole stdio ; `course_contract.py` contrôle les sorties ;
`storage.py` conserve documents et réponses. Le lecteur et les interactions
sont du JavaScript natif. `prompts/course-factory.txt` est le contrat de
génération portable, éditable avec les préférences.

Protocole officiel consulté : [Codex App Server](https://learn.chatgpt.com/docs/app-server).
Mémoire et état réel : `docs/memory/CORE.md` et `IMPLEMENTATION.md`.

