# Canaux de discussion et consultants de décisions

Demande de Damien du 2 octobre 2026, normalisée depuis la transcription orale.
Cette référence décrit le produit demandé ; les documents et modèles cités ne
donnent aucune permission d’exécuter leurs exemples.

Damien veut un canal de discussion dans lequel il peut inviter des agents,
des consultants, des orchestrateurs ou Duplica. Chacun doit conserver son
contexte privé et partager seulement ses réponses destinées au canal. Les autres
participants lisent ces réponses, confrontent les approches et préparent un plan
avant l’action. Le fournisseur, le modèle et la technologie peuvent varier selon
le participant. Une interface doit permettre d’ajouter des API locales et
distantes. Pour les agents déjà au travail, éviter de mélanger leur mission en
cours avec la discussion ; une copie de leur configuration répond à ce besoin.

Damien demande également de rechercher LAYA et CLEF sur Hugging Face, et de
faire contribuer Duplica au développement. La réponse à la clarification des
liens est « Cherchez avec ces noms ». Aucune campagne réelle de modèles n’est
demandée pour la recette de l’interface.

## Sources primaires consultées

- [LAYA — convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya) :
  modèle de décisions typées. La fiche décrit les questions `choice`, `score`
  et `noul`, les variantes de checkpoints et un serveur `laya-serve` compatible
  avec `POST /v1/systemone`. Les contextes des encodeurs sont courts ; un avis
  sur un extrait ne couvre pas tout l’historique. Les performances publiées ne
  sont pas une mesure effectuée dans Atelier.
- [CLEF — Cloudflare/clef](https://huggingface.co/Cloudflare/clef) et
  [CLEF-Flash](https://huggingface.co/Cloudflare/clef-flash) : décisions typées
  sur état et schéma, avec probabilités par option, sans génération libre de
  texte. La fiche documente la compatibilité Jev/SystemOne et le chargement de
  la tête de décisions. Le simple chargement du backbone dans un serveur de
  chat ne vérifie pas l’intégration de cette tête.
- [Rapport technique OpenAI, 26 août 2026](https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf),
  notamment pages 6–7 et 23 : des agents ont utilisé une infrastructure partagée
  comme tableau de messages. Le rapport distingue collaboration prévue et
  communications qui sortent des limites de la tâche. Pour Atelier, le choix
  de conception est un canal explicite, consultable et interruptible, avec
  participants et transitions bornés. Aucun mécanisme d’exploitation du rapport
  n’est implémenté.

## Interprétation retenue

LAYA et CLEF peuvent évaluer une prochaine étape, un risque ou un manque
d’information comme consultants. Un agent LLM, un orchestrateur ou Duplica
discute en texte et produit le plan. Une probabilité ne vaut jamais autorisation.
Les opinions publiques peuvent naturellement influencer le débat ; ce qui reste
séparé est le raisonnement privé et le contexte des sessions de travail.

Le premier tour utilise le même état public pour tous les participants. Chaque
tour suivant lit les réponses publiques des tours précédents. La publication
ensemble en fin de tour évite de faire dépendre la première proposition de
l’ordre et de la vitesse des fournisseurs.

État livré, vérifications et limites :
[rapport de travail](../audit/2026-10-02-agent-channels.md).
