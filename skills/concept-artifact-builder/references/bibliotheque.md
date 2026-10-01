# Bibliothèque de simulateurs — specs prêtes à construire

Six artifacts spécifiés selon le contrat 10 rubriques. Adapter, ne pas recoder
de zéro. Format recommandé indiqué ; le protocole PRÉDIS→EXÉCUTE→COMPARE
s'applique à chaque expérience.

---

## S1 — Simulateur de valeurs propres

**1. Concept** : valeurs/vecteurs propres (algèbre linéaire). Prérequis : produit
matrice-vecteur. Ouvre : diagonalisation, SVD, stabilité des systèmes, PCA.
**2. Intuition cible** : "une matrice a des directions privilégiées où elle se
contente d'étirer — les vecteurs propres — et le facteur d'étirement est la
valeur propre. Tout le comportement long-terme de la matrice se lit là."
**3. Variables** : les 4 coefficients d'une matrice 2×2 (sliders −3..3) ;
presets : symétrique, rotation, cisaillement, singulière.
**4. Signification** : a,b,c,d = comment la matrice mélange x et y ; λ₁,λ₂ =
étirements le long des directions propres ; det = produit λ₁λ₂ (aire) ;
trace = somme λ₁+λ₂.
**5. Conséquences** :
| Si... | Alors... | Parce que |
|---|---|---|
| matrice symétrique | vecteurs propres orthogonaux | théorème spectral |
| \|λ\|>1 | itérer Av, A²v... explose dans cette direction | étirement composé |
| \|λ\|<1 pour tous | toute trajectoire converge vers 0 | contraction — stabilité |
| det<0 | une direction se retourne | λ de signes opposés |
| matrice de rotation | aucun vecteur propre réel visible | λ complexes |
**6. Pièges** : (a) "toute matrice a des vecteurs propres réels" → régler une
rotation 90°, le champ ne se fixe nulle part ; (b) "vecteurs propres = directions
d'étirement max" → faux en général : matrice non symétrique, comparer avec les
directions singulières (pont vers SVD) ; (c) "diagonalisable = inversible" →
preset cisaillement (λ double, non diagonalisable) vs preset singulière.
**7. Code** : HTML canvas single-file OU notebook matplotlib : grille de points +
cercle unité transformés en direct ; vecteurs propres superposés en couleur ;
mode "itération" (Aⁿv animé) pour la stabilité.
**8. Test** : identité → λ=1,1 tout vecteur propre ; diag(2,3) → λ=2,3 axes
canoniques ; rotation 90° → pas de λ réel.
**9. Questions** : pourquoi la trajectoire Aⁿv s'aligne-t-elle toujours sur le
vecteur propre dominant ? où est λ dans det et trace ? quel signal en entretien
indique "problème de valeurs propres" (itération, long-terme, stabilité, mode
propre) ? explique valeurs propres vs valeurs singulières en 2 phrases.
**10. Liens** : stabilité de systèmes dynamiques, PCA (covariance symétrique →
axes orthogonaux), chaînes de Markov (λ=1), pont direct vers S2 (Markowitz :
la covariance est symétrique définie positive).

---

## S2 — Simulateur Markowitz (frontière efficiente)

**1. Concept** : optimisation moyenne-variance. Prérequis : espérance, variance,
covariance (≥ mobilisable). Ouvre : CAPM, betas, risk budgeting.
**2. Intuition cible** : "la diversification est le seul free lunch : à rendement
égal, le risque du portefeuille peut être INFÉRIEUR au risque de chaque actif —
et tout se joue dans la covariance, pas dans les variances."
**3. Variables** : 3 actifs — μᵢ (0–15%), σᵢ (5–40%), corrélations ρᵢⱼ (−1..1) ;
contrainte short autorisé oui/non ; taux sans risque (pour la tangente).
**4. Signification** : μ = rendement espéré (moteur) ; σ = incertitude (coût) ;
ρ = danse commune des actifs (le terme 2wᵢwⱼρσᵢσⱼ de la variance du portefeuille) ;
w = poids (les leviers qu'on optimise).
**5. Conséquences** :
| Si... | Alors... | Parce que |
|---|---|---|
| ρ ↓ vers −1 | la frontière se bombe vers la gauche, σ_min → 0 | les termes croisés annulent la variance |
| ρ = +1 | frontière = segment de droite, zéro diversification | σ portefeuille = moyenne pondérée |
| un μᵢ ↑ | les poids basculent vers cet actif, frontière monte | trade-off rendement/risque déplacé |
| short interdit | frontière tronquée | l'optimum voulait wᵢ<0 |
| rf ↑ | le point de tangence glisse | pente de la CML change |
**6. Pièges** : (a) "diversifier = ajouter des actifs" → 3 actifs ρ=0.95 vs
2 actifs ρ=0.2 ; (b) "le portefeuille min-variance contient surtout l'actif le
moins risqué" → régler des corrélations qui donnent un poids dominant ailleurs ;
(c) sensibilité : bouger μ₁ de 1% → les poids sautent violemment (l'optimisation
est instable aux inputs — la vraie leçon desk).
**7. Code** : notebook — nuage de portefeuilles aléatoires (gris) + frontière
(couleur) + poids affichés en barres pour le point sélectionné ; sliders ρ, μ, σ.
**8. Test** : ρ=1 → droite exacte ; 2 actifs identiques → w=50/50 ; formule
analytique min-variance 2 actifs retrouvée.
**9. Questions** : montre le terme de covariance dans σ²_p = Σwᵢwⱼσᵢⱼ ; pourquoi
σ_min→0 quand ρ→−1 ? pourquoi les desks n'utilisent pas Markowitz brut (instabilité
des inputs) ? signal d'entretien : "comment construire un portefeuille" → quelle
est TA première question (la matrice de covariance) ?
**10. Liens** : valeurs propres de la matrice de covariance (S1, PCA des
facteurs de risque), hedging (minimiser une variance = même maths), Monte Carlo
(S5) pour estimer μ,Σ et voir l'erreur d'estimation.

---

## S3 — Simulateur de duration (sensibilité obligataire)

**1. Concept** : duration (Macaulay/modifiée) + convexité en second rideau.
Prérequis : actualisation. Ouvre : DV01, immunisation, hedging de courbe.
**2. Intuition cible** : "la duration est le centre de gravité temporel des flux
actualisés — plus le cash arrive tard, plus le prix est sensible aux taux.
C'est une dérivée : elle n'est juste que pour les petits mouvements."
**3. Variables** : maturité (1–30 ans), coupon (0–10%), taux y (0–10%, slider
continu), fréquence (annuel/semestriel) ; choc de taux Δy (−300..+300 bp).
**4. Signification** : coupon = cash tôt (abaisse la duration) ; y = taux
d'actualisation (le facteur 1/(1+y)ᵗ) ; D_mod = −(1/P)·dP/dy = % de perte pour
+1% de taux ; convexité = courbure, l'erreur de l'approximation linéaire.
**5. Conséquences** :
| Si... | Alors... | Parce que |
|---|---|---|
| coupon ↑ | duration ↓ | centre de gravité des flux avance |
| maturité ↑ | duration ↑ (mais plafonne pour coupons élevés) | flux lointains pèsent plus |
| y ↑ | duration ↓ | les flux lointains sont écrasés par l'actualisation |
| Δy grand | l'approx. linéaire sous-estime le prix dans les 2 sens | convexité>0 |
| coupon = 0 | duration = maturité exactement | un seul flux |
**6. Pièges** : (a) "duration = maturité" → obligation 30 ans coupon 8% vs
zéro-coupon 12 ans : même duration ; (b) "la duration suffit pour hedger" →
choc de 300 bp : montrer l'écart prix réel vs prédiction linéaire (la convexité
gagne de l'argent des deux côtés) ; (c) visualisation "planche à bascule" :
les flux actualisés comme masses sur une planche, la duration est le pivot.
**7. Code** : notebook — panneau 1 : la planche (barres des flux actualisés,
pivot = duration, bouge en direct) ; panneau 2 : courbe prix/taux exacte vs
tangente (duration) vs parabole (+ convexité) ; DV01 affiché.
**8. Test** : zéro-coupon → D=T ; perpétuité → D=(1+y)/y ; DV01 recalculé par
différence finie = formule.
**9. Questions** : pourquoi un coupon élevé BAISSE la duration ? où est le terme
t·CFₜ/(1+y)ᵗ dans la formule ? deux obligations, laquelle chute plus si +100 bp
et à quel signal tu le vois ? qu'est-ce que le desk fait avec le DV01 d'un book ?
**10. Liens** : dérivée première/seconde (Taylor), delta/gamma des options
(même structure : sensibilité + courbure), jambe fixe d'un swap (S4 : la duration
du swap vit presque toute dans la jambe fixe).

---

## S4 — Simulateur de swap de taux

**1. Concept** : swap vanille fixe contre variable — pricing par courbe,
PV des jambes, DV01. Prérequis : actualisation, duration (S3). Ouvre : courbe
de taux, asset swaps, hedging de book.
**2. Intuition cible** : "un swap vaut zéro à l'initiation parce que le taux fixe
est CHOISI pour égaliser les deux jambes ; ensuite, chaque mouvement de courbe
crée du PV — et la jambe variable, elle, revient toujours au pair aux dates de
fixing."
**3. Variables** : courbe zéro-coupon par 4 points pilotables (1a, 2a, 5a, 10a,
interpolation) ; maturité du swap ; notionnel ; taux fixe K (par défaut : le taux
swap par équilibre) ; déplacement de courbe : parallèle / pentification /
aplatissement.
**4. Signification** : courbe = prix du temps (chaque DF(t) actualise un flux) ;
jambe fixe = obligation à coupons K ; jambe variable ≈ pair au prochain fixing ;
PV = jambe reçue − jambe payée ; DV01 = sensibilité du PV à +1 bp parallèle.
**5. Conséquences** :
| Si... | Alors... | Parce que |
|---|---|---|
| courbe ↑ parallèle (payeur fixe) | PV ↑ | on paie un fixe devenu bon marché |
| pentification (long ↑) | swap long gagne pour le payeur fixe | flux lointains du fixe écrasés |
| au fixing | PV jambe variable → pair | le coupon suivant est recalé au marché |
| K > taux swap | PV<0 pour le payeur fixe dès t=0 | il paie trop cher |
| maturité ↑ | DV01 ↑ presque proportionnellement | duration de la jambe fixe |
**6. Pièges** : (a) "la jambe variable est risquée car inconnue" → montrer que
son PV est le plus stable des deux (elle se recale) — c'est la jambe FIXE qui
porte le risque de taux ; (b) "un swap à PV nul est sans risque" → PV=0 mais
DV01≠0 ; (c) déplacement non parallèle : le DV01 unique ment, il faut les DV01
par bucket.
**7. Code** : notebook — timeline des flux (positifs reçus / négatifs payés,
règle cashflow CAL) + courbe manipulable + PV des deux jambes en barres + DV01
par bucket.
**8. Test** : courbe plate à y : taux swap = y ; PV(t=0, K=taux swap) = 0 ;
DV01 = somme des DV01 de la jambe fixe − variable recalculée par bump.
**9. Questions** : qui paie qui et quand (dessine la timeline de mémoire) ?
pourquoi la jambe variable vaut ~pair ? où va le PnL du payeur fixe si la courbe
se pentifie et pourquoi ? quel est le hedge naturel d'un swap payeur (obligation,
futures, autre swap) ?
**10. Liens** : duration (S3) — la jambe fixe EST une obligation ; bootstrap
de courbe ; convention 360/365 (piège classique d'entretien) ; market making
(S6) : le desk swap cote bid/ask autour du taux mid.

---

## S5 — Simulateur Monte Carlo (convergence et erreur)

**1. Concept** : estimation par Monte Carlo — LLN, CLT, vitesse 1/√N, réduction
de variance. Prérequis : espérance/variance, loi des grands nombres (intuition).
Ouvre : pricing d'options exotiques, greeks par MC, quasi-MC.
**2. Intuition cible** : "Monte Carlo converge toujours, mais lentement — l'erreur
tombe en 1/√N : pour un chiffre de précision en plus, il faut 100× plus de
tirages. La variance de l'estimateur est le vrai ennemi, pas le nombre de tirages."
**3. Variables** : N (10²–10⁷, échelle log) ; loi des tirages (uniforme, normale,
Student-t df=3, lognormale) ; quantité estimée (moyenne, P(X>seuil), prix d'un
call) ; seed ; méthode : brute / antithétique / variable de contrôle.
**4. Signification** : N = budget de calcul ; σ de la loi = dispersion de ce
qu'on moyenne (numérateur de l'erreur σ/√N) ; seed = reproductibilité ; les
méthodes de réduction attaquent σ, pas N.
**5. Conséquences** :
| Si... | Alors... | Parce que |
|---|---|---|
| N ×100 | erreur ÷10 seulement | 1/√N |
| loi à queues lourdes (Student df=3) | convergence erratique, sauts | variance des tirages énorme/infinie |
| événement rare (P=0.001) | estimation nulle ou bruitée à petit N | presque aucun tirage ne compte |
| antithétique | erreur ↓ à N égal | corrélation négative entre paires |
| changer la seed | l'estimé bouge dans la bande ±2σ/√N | c'est une variable aléatoire |
**6. Pièges** : (a) "10 000 tirages c'est beaucoup" → événement rare : l'estimé
est 0 ; (b) "la convergence est régulière" → tracer 20 chemins d'estimation
(seeds différentes) : c'est une BANDE, pas une courbe ; (c) "MC donne LE prix" →
toujours l'intervalle de confiance, jamais le point seul (règle desk).
**7. Code** : notebook — erreur vs N en log-log (pente −1/2 visible) + bande de
confiance + comparaison des lois + panel pricing call (MC vs Black-Scholes fermé
comme vérité terrain).
**8. Test** : moyenne d'uniformes → 0.5 ; prix call MC ±2 erreurs-types contient
le prix Black-Scholes fermé ; pente log-log ≈ −0.5.
**9. Questions** : pourquoi ÷10 d'erreur coûte ×100 de calcul — montre-le dans
σ/√N ; que fait la variable de contrôle exactement ; pourquoi ton desk ne price
pas un digital très hors-monnaie en MC brut ; explique l'intervalle de confiance
d'un prix MC comme à un trader pressé.
**10. Liens** : CLT (la forme gaussienne de la bande), Markowitz S2 (l'erreur
d'estimation de μ, Σ EST un problème MC), pricing risque-neutre (mesure Q —
préciser la mesure, règle CAL finance).

---

## S6 — Simulateur de market making

**1. Concept** : market making — spread, inventaire, sélection adverse, PnL.
Prérequis : espérance, bid/ask. Ouvre : microstructure, Avellaneda-Stoikov,
gestion de book.
**2. Intuition cible** : "le market maker gagne le spread sur le flux non informé
et le perd contre le flux informé — tout son art est de gérer l'inventaire pour
survivre aux mouvements adverses, quitte à décentrer ses quotes."
**3. Variables** : demi-spread δ (1–50 bp) ; skew des quotes en fonction de
l'inventaire (0 = aucun, sinon décale mid ∓ k·inventaire) ; limite d'inventaire ;
proportion de flux informé α (0–50%) ; volatilité du prix fondamental ; durée
de simulation. Mode manuel (mini-jeu : l'utilisateur cote à chaque tour) ou auto.
**4. Signification** : δ = rémunération par trade ET répulsif de flux (spread
large → moins de trades) ; α = probabilité que le client en sache plus ;
inventaire = position subie, exposée à σ ; skew = le prix qu'on paie pour se
délester ; PnL = Σ spreads captés − coût des mouvements adverses × inventaire.
**5. Conséquences** :
| Si... | Alors... | Parce que |
|---|---|---|
| δ ↑ | PnL/trade ↑ mais volume ↓ | élasticité du flux |
| α ↑ | PnL ↓, pertes concentrées après les trades "toxiques" | sélection adverse |
| skew = 0 | inventaire fait des marches aléatoires, gros drawdowns | rien ne le rappelle vers 0 |
| skew ↑ | inventaire contrôlé, PnL plus stable mais spread effectif réduit | on paie pour se délester |
| σ ↑ | il faut δ et skew plus grands | le coût de porter l'inventaire monte |
**6. Pièges** : (a) "spread étroit = compétitif = bien" → α=30% : on se fait
courir dessus, PnL négatif malgré le volume ; (b) "le PnL vient du volume" →
décomposer PnL = spread capté + PnL d'inventaire : le second domine souvent en
négatif ; (c) "l'inventaire est neutre en moyenne donc sans risque" → la variance
du PnL vient presque toute de là.
**7. Code** : notebook ou HTML mini-jeu à tours — prix fondamental simulé,
arrivées de clients (informés/non), l'utilisateur (ou la règle) cote bid/ask ;
affichage : PnL décomposé (spread vs inventaire), inventaire, trades toxiques
marqués. Seeds fixées, mode replay pour comparer deux politiques sur le MÊME flux.
**8. Test** : α=0, skew quelconque → PnL moyen ≈ δ × volume ; α élevé, δ petit →
PnL négatif systématique ; replay : deux politiques, mêmes tirages.
**9. Questions** : décompose ton PnL final — d'où viennent les pertes ? pourquoi
décentrer ses quotes quand on est long ? à quel signal reconnais-tu la sélection
adverse dans les données (PnL conditionnel post-trade) ? question d'entretien :
"tu es market maker, la vol double, que fais-tu de ton spread et pourquoi ?"
**10. Liens** : sélection adverse = asymétrie d'information (économie, Akerlof) ;
inventaire = problème de contrôle stochastique (Avellaneda-Stoikov) ; Monte Carlo
S5 (le replay à seed fixée est une technique de réduction de variance de
comparaison) ; trading-sim pour passer du simulateur au paper trading réel.
