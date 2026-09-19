# Spécification produit - Regroupement d'élèves en classes

## Problème

Un professeur veut répartir une liste d'élèves dans un nombre fixé de classes en respectant des contraintes scolaires réelles, sans écrire de code ni manipuler un outil trop complexe. Aujourd'hui, il faut pouvoir préparer deux CSV stricts, lancer un regroupement, et obtenir une ou plusieurs propositions de classes lisibles, exportables, et accompagnées d'un diagnostic clair quand toutes les contraintes ne peuvent pas être satisfaites.

## Solution

Une page web JavaScript simple, en une seule vue, permet de charger des CSV stricts, de régler les paramètres d'optimisation, puis de lancer un algorithme de regroupement basé sur une heuristique simple. L'application affiche un aperçu des données importées, calcule jusqu'à trois propositions de classes, et exporte le résultat en CSV. Les données et les résultats restent côté navigateur. Une aide intégrée explique le format des fichiers et les paramètres.

## Objectifs utilisateur

En tant qu'utilisateur, je veux :

1. importer un CSV d'élèves strict pour que je puisse préparer mes données sans ambiguïté de format.
2. importer un CSV de groupes strict pour que je puisse exprimer les contraintes de type groupés.
3. que l'application valide la présence des colonnes id, rep1, rep2, app1, app2, comp, avec, sans dans le CSV d'élèves pour que je sache immédiatement si mon fichier est compatible.
4. que l'application accepte les colonnes optionnelles poids_avec et poids_sans dans le CSV d'élèves pour ajuster les règles élève par élève.
5. que l'application valide la présence des colonnes groupe, poids dans le CSV de groupes pour que je sache immédiatement si mon fichier est compatible.
6. que l'application rejette tout nom de colonne qui ne correspond pas au schéma attendu pour que je puisse corriger mes fichiers avant calcul.
7. que l'application traite rep1, rep2, etc. comme des drapeaux binaires. Ainsi, une cellule non vide signifie simplement que l'élève appartient à ce groupe de répartition.
8. que l'application traite app1, app2, etc. comme des drapeaux binaires. Ainsi, une cellule non vide signifie simplement que l'élève appartient à ce groupe de paire.
9. que l'application interprète comp comme un score entier entre -2 et 2, afin que l'équilibre du comportement reste simple à encoder.
10. que les cellules comp vides soient traitées comme 0, afin que je n'aie pas à remplir chaque ligne manuellement.
11. que les colonnes avec et sans me permettent d'exprimer directement les paires positives et négatives, afin de ne plus maintenir un CSV de paires séparé.
12. que l'application affiche un aperçu des lignes importées au lieu de l'ensemble du jeu de données par défaut, afin que la page reste lisible.
13. pouvoir ouvrir un modal pour inspecter le contenu complet du CSV importé, afin que je puisse vérifier l'ensemble du jeu de données lorsque c'est nécessaire.
14. pouvoir spécifier le nombre maximum d'élèves par classe, afin que le regroupement respecte la contrainte de capacité.
15. pouvoir spécifier le nombre de classes, afin que l'algorithme cible la structure de classe exacte dont j'ai besoin.
16. que tous les paramètres de l'algorithme soient visibles dans la version 1, afin que je puisse ajuster le comportement selon mes besoins.
17. que l'application utilise une seule stratégie d'optimisation, afin que le comportement reste compréhensible et debuggable.
18. que l'algorithme retourne jusqu'à trois propositions, afin que je puisse comparer plusieurs regroupements plausibles.
19. que le tableau des résultats contienne toujours trois colonnes de proposition, afin que le format d'exportation reste stable.
20. que les colonnes de proposition contiennent des entiers de 1 au nombre de classes, afin que je puisse copier le résultat directement dans une feuille de calcul.
21. que les élèves restent dans le même ordre de ligne que le CSV d'entrée, afin que je puisse vérifier le résultat avec le fichier source.
22. que l'application génère un diagnostic lorsqu'aucune solution parfaite n'existe, afin que je comprenne pourquoi certaines contraintes ont été violées.
23. que l'application retourne encore la meilleure solution trouvée lorsque les contraintes ne peuvent toutes être satisfaites, afin que je puisse utiliser le regroupement moins mauvais au lieu de rien.
24. que les contraintes avec et sans influencent le score sans bloquer totalement la sortie.
25. que l'équilibre de la taille des classes influence le score, afin que les classes restent proches en taille lorsque c'est possible.
26. que les poids définis pour la capacité des classes, l'équilibre de la distribution et l'équilibre du comportement soient pris en compte dans le score.
27. que le regroupement soit calculé entièrement dans le navigateur, afin que mes données d'élèves ne quittent pas mon poste de travail.
28. exporter le résultat final sous forme de CSV, afin que je puisse archiver ou partager facilement la proposition.
29. copier le résultat dans un format convivial pour les tableurs, afin que je puisse le coller directement dans mon outil de bureau habituel.
30. un bouton d'aide avec des exemples d'utilisation et des conventions, afin que je puisse me souvenir rapidement de la structure CSV attendue.
31. un bouton de contact pour les commentaires et les rapports de bugs, afin que je puisse proposer des améliorations sans quitter l'outil.
32. une interface d'une seule page, afin que je puisse compléter l'ensemble du workflow sans naviguer entre plusieurs écrans.
33. que l'application rende évidente la séquence de réglage des paramètres, d'importation, d'exécution et d'affichage des résultats, afin que le workflow reste simple.
34. que l'application renvoie une erreur claire lorsque le CSV d'entrée est mal formé, afin que je puisse corriger les problèmes avant de lancer l'optimisation.
35. savoir quelles sont les contraintes non satisfaites lorsque la solution est imparfaite, afin que je puisse juger si j'accepte ou ajuste l'entrée.
36. que le diagnostic de chaque proposition apparaisse juste au-dessus de son tableau de résultats, afin de lire immédiatement score et violations.

## Décisions d'implémentation

- Le produit est une simple application web monopage en JavaScript.
- La V1 utilise deux entrées CSV strictes : un CSV d'élèves et un CSV de groupes.
- À l'ouverture d'un CSV, le séparateur est détecté automatiquement entre virgule et point-virgule.
- Le schéma du CSV d'élèves est fixe à id, rep1, rep2, etc., app1, app2, etc., comp, avec, sans, avec deux colonnes optionnelles poids_avec et poids_sans :
  - `id` est l'identifiant unique de l'élève utilisé partout dans le flux de travail.
  - Le CSV d'élèves est la référence des identifiants et ne doit contenir aucun doublon de `id`.
  - Les colonnes `rep*` sont des drapeaux binaires interprétés comme non vide = vrai et vide = faux.
  - Les colonnes `app*` sont des drapeaux binaires interprétés comme non vide = vrai et vide = faux.
  - `comp` est un score de comportement numérique restreint aux valeurs entières de -2 à 2, avec vide qui signifie 0.
  - `avec` contient une liste d'identifiants d'élèves séparés par |. Une case vide signifie aucune règle avec pour l'élève.
  - `sans` contient une liste d'identifiants d'élèves séparés par |. Une case vide signifie aucune règle sans pour l'élève.
  - `poids_avec` est optionnelle. Si vide, la règle avec utilise le poids par défaut global.
  - `poids_sans` est optionnelle. Si vide, la règle sans utilise le poids par défaut global.
  - Tout identifiant mentionné dans `avec` et `sans` doit exister strictement dans le CSV d'élèves.
  - Les champs `avec` et `sans` ne doivent contenir aucun identifiant vide.
- Le CSV de groupes est strict et contient les colonnes groupe, poids.
  - `groupe` contient une liste d'identifiants d'élèves séparés par |.
  - `groupe` ne doit contenir aucun identifiant vide.
  - Tout identifiant mentionné dans `groupe` doit exister strictement dans le CSV d'élèves.
  - `poids` est obligatoire et positif.
- Sémantique des règles :
  - avec : l'élève de la ligne doit être avec au moins un élève listé dans `avec`.
  - sans : l'élève de la ligne doit éviter tous les élèves listés dans `sans`.
  - groupés : chaque élève de `groupe` ne doit pas être isolé des autres membres du même groupe.
  - groupés : un bonus de score est ajouté lorsque tous les élèves d'un même `groupe` sont affectés à une seule classe.
- La sortie contient toujours trois colonnes de proposition même si l'algorithme trouve naturellement moins ou plus de candidats.
- Si moins de trois propositions sont générées, les colonnes de propositions manquantes restent vides.
- Les valeurs de proposition sont des entiers de 1 au nombre de classes.
- La sortie préserve l'ordre original des élèves du CSV d'entrée.
- L'application présente une seule page avec des zones d'importation, de paramétrage, d'exécution, de prévisualisation, de résultat, d'aide et de contact.
- L'algorithme est une seule stratégie d'optimisation simple implémentée en JavaScript pur, favorisant une heuristique de score et une amélioration locale plutôt qu'un solveur plus lourd.
- En V1, tous les paramètres de l'algorithme de classification sont modifiables par l'utilisateur dans l'interface (aucun paramètre caché).
- Les paramètres modifiables en V1 sont au minimum :
  - nombre de classes ;
  - nombre maximal d'élèves par classe ;
  - nombre max d'itérations ;
  - poids de chaque contrainte ;
  - poids de l'équilibre de taille des classes ;
  - poids par défaut de avec (utilisé quand poids_avec est vide) ;
  - poids par défaut de sans (utilisé quand poids_sans est vide) ;
  - coefficient de pénalité d'isolement pour groupés ;
  - coefficient de bonus de regroupement complet pour groupés.
- La fonction de score agrège les contraintes issues des colonnes rep/app/comp, des colonnes avec/sans, et du CSV de groupes.
- La fonction de score applique pour groupés une pénalité d'isolement et un bonus de regroupement complet dans une seule classe.
- Toutes les contraintes sont intégrées à une fonction de score commune avec des poids indépendants.
- Les contraintes avec, sans et groupés contribuent au score avec leurs poids respectifs.
- Lorsqu'une proposition contient des violations détaillées, le diagnostic retourne leur type et les élèves concernés.
- Les violations détaillées sont émises pour les contraintes liées aux colonnes app*, et le type retourné est le nom exact de la colonne app* correspondante (par exemple app1, app2).
- Dans tous les cas, chaque proposition renvoyée inclut son score global et le nombre total de contraintes violées.
- Pour chaque proposition affichée (de une à trois), le diagnostic est rendu juste au-dessus du tableau de résultats correspondant.
- Le diagnostic affiché contient toujours le score global et le nombre total de contraintes violées, et ajoute les détails uniquement si nécessaire.
- L'algorithme renvoie jusqu'à trois propositions car plusieurs variantes à score élevé peuvent être générées à partir de multiples initialisations.
- L'aperçu CSV et le modal de données complètes sont des vues séparées d'un même jeu de données normalisé.
- Le modal d'aide documente le schéma strict, la signification de chaque famille de colonnes et des exemples d'entrée valides et invalides.
- L'action de contact est une voie directe de retour pour les améliorations et les rapports de bugs.
- Le test principal est le pipeline de classification normalisé : CSV strict en entrée plus paramètres d'algorithme, propositions classées et diagnostics en sortie.
- Le format d'erreur CSV est standardisé et bloquant : fichier, ligne, colonne, champ, code, message, valeur lue.

## Décisions de test

- La couche de validation du CSV doit être testée avec des fichiers valides, des en-têtes mal formés, des colonnes requises manquantes, des plages numériques invalides et des colonnes inconnues.
- La validation d'entrée doit couvrir la détection automatique du séparateur virgule/point-virgule.
- La validation du CSV d'élèves doit couvrir le format des colonnes avec/sans, les poids optionnels poids_avec/poids_sans, et les contraintes de référentiel d'identifiants.
- La validation du CSV d'élèves doit rejeter les champs avec/sans contenant des identifiants vides.
- La validation du CSV de groupes doit couvrir le format de groupe et un poids strictement positif.
- La validation référentielle doit rejeter tout identifiant des colonnes avec/sans ou du CSV de groupes absent du CSV d'élèves.
- La validation du CSV d'élèves doit rejeter les doublons d'identifiant.
- Les bons tests n'assertent que le comportement externe : schémas CSV acceptés, interprétation normalisée des valeurs, forme du résultat, diagnostics et comportement de classement.
- La couche de normalisation doit être testée avec des valeurs de comportement vides, des marqueurs de groupe binaires, des colonnes avec/sans, et des groupes issus du CSV de groupes.
- La couche d'optimisation doit être testée avec de petits ensembles de données synthétiques où les compromis attendus sont évidents.
- La couche d'optimisation doit vérifier que le bonus groupés est bien appliqué quand un groupe entier est dans la même classe.
- La couche de formatage des résultats doit être testée pour une sortie stable à trois colonnes de proposition et un ordre d'entrée préservé.
- La couche de formatage des résultats doit vérifier que les colonnes de propositions non générées restent vides.
- La couche de diagnostic doit être testée pour les cas résolubles et impossibles.
- La couche de diagnostic doit vérifier que les violations détaillées correspondent aux contraintes app*, et que le type retourné correspond exactement au nom de la colonne app* violée.
- La couche de résultats doit vérifier que chaque proposition contient toujours un score global et un nombre total de contraintes violées.
- La couche d'interface doit vérifier que le bloc de diagnostic est positionné juste au-dessus du tableau de la proposition correspondante.
- La couche d'interface doit vérifier que les détails ne sont affichés que lorsqu'il existe des violations détaillées.
- La couche d'interface doit vérifier l'affichage des erreurs CSV avec les champs fichier, ligne, colonne, champ, code, message, valeur lue.
- La couche d'optimisation doit vérifier le respect du paramètre nombre max d'itérations.
- La couche d'interface doit vérifier que tous les paramètres listés en V1 sont éditables par l'utilisateur.
- La couche d'interface doit vérifier que les paramètres modifiés sont bien pris en compte dans le calcul.
- Le modal d'aide et l'action de contact doivent être testés comme des comportements d'interface utilisateur plutôt que des détails d'implémentation interne.
- Il n'existe pas de suite de tests automatisés dans cet espace de travail, donc la conception initiale des tests doit prioriser un ensemble mince de tests de comportement à forte valeur autour du pipeline de classification normalisé.
- L'algorithme d'optimisation doit renvoyer au moins une classification satisfaisante pour les deux fichiers d'exemple `data/exemple_eleves.csv` et `data/exemple_groupes.csv`.

## Hors du cadre

- Formats d'entrée multiples au-delà du schéma strict à deux CSV.
- Détection de noms de colonnes libres ou correspondance de synonymes.
- Édition manuelle des tableaux dans le navigateur dans la V1.
- Étiquettes de classe nommées saisies par l'utilisateur dans la V1.
- Algorithmes d'optimisation multiples sélectionnables par l'utilisateur.
- Stockage ou synchronisation côté serveur.
- Métriques d'équité avancées au-delà des contraintes actuellement définies.
- Un solveur mathématique exact complet comme implémentation principale.
- Navigation multi-étapes ou structure d'application multi-pages.
- Intégration automatique du suivi des problèmes à partir de cet espace de travail, qui n'expose actuellement pas de métadonnées de suivi.

## Notes complémentaires

- Le répertoire de travail actuel contient uniquement un document de spécification et aucun code d'application, donc cette spécification est intentionnellement prête pour l'implémentation mais pas encore ancrée à des modules existants.
- Le point de test recommandé est intentionnellement élevé : un pipeline de classification normalisé devrait couvrir l'importation, la normalisation, le scoring, la génération de propositions et la sortie de diagnostic.
- Le schéma strict dans cette spécification est optimisé pour un usage personnel en V1 et peut être assoupli plus tard si une V2 plus large destinée aux enseignants est prévue.
- Le vocabulaire du produit doit rester stable autour de : CSV d'élèves, CSV de groupes, groupe de répartition, groupe d'appariement, score de comportement, proposition et diagnostic.
