# Regrouper des élèves dans des classes en respectant des contraintes

Le projet est de faire une page web en JavaScript simple sur laquelle un utilisateur (typiquement un professeur de collège) peut spécifier des contraintes dures et souples sous forme de deux tableaux.
La page web doit produire un regroupement satisfaisant les contraintes dures et optimisant les contraintes souples. Le résultat peut être rendu sous forme de tableau avec une seule colonne (les lignes sont les élèves dans le même ordre que le premier tableau d'entrée et la colonne donne la classification). Si l'algorithme retourne plusieurs classifications, elles peuvent être retournées sous forme de plusieurs colonnes.

## Algorithme de classification

L'objectif de l'algorithme est de trouver une classification qui satisfait strictement les contraintes dures suivantes :

1. Certains élèves doivent appartenir à la même classe (e.g. s'ils ont la même option facultative) dans la limite du nombre maximal d'élèves par classe,
2. Le nombre d'élèves dans chaque classe ne doit pas dépasser un seuil (e.g. au plus X élèves par classe, où X est un nombre défini par l'utilisateur),
3. Certains groupes d'élèves doivent être répartis de manière équilibrée dans les classes (e.g. les filles et les garçons),
4. Le score de comportement des classes doit être équilibré (la somme des scores de comportement des élèves dans chaque classe doit être approximativement la même).

et les contraintes souples suivantes :

1. Des paires d'élèves ne doivent pas appartenir à la même classe (e.g. ils ont une mauvaise relation),
2. Des paires d'élèves doivent appartenir à la même classe (e.g. ils ont une bonne relation),
3. Le nombre d'élèves dans chaque classe doit être approximativement le même.

UN POINT CLÉ est de garder le JavaScript simple (choisir un algorithme avec une implémentation simple en utilisant le moins de modules possibles).
Voici quelques idées d'algorithmes qui pourraient convenir :

- PC-KMeans,
- Adapter des algorithmes de classroom scheduling,
- Adapter un algorithme de knapsack,
- Adapter l'algorithme A*,
- Algorithme de descente de gradient avec une function de perte bien choisie.

## Contraintes d'entrée

Les contraintes seront renseignées par l'utilisateur sous forme de deux tableaux :

1. le premier tableau contient une ligne par élève avec :
   - une colonne d'identification (Nom/Prénom ou identifiant anonyme)
   - une colonne pour chaque contrainte de répartition : par exemple, colonne "Sexe" (une case non vide veut dire que l'élève est une fille). Les élèves de ce groupe doivent être répartis de manière équilibrée dans les classes.
   - une colonne pour chaque contrainte d’appariement : par exemple, colonne "Allemand" (une case non vide veut dire que l'élève suit l'option Allemand). Si la limite du nombre d'élèves par classe le permet, les élèves de ce groupe doivent être dans la même classe. Sinon, les sous-groupes créés doivent être le moins nombreux possibles et de tailles similaires.
   - une colonne de comportement (score entre -2 et +2, une case vide signifiant 0) : les sommes des scores de chaque classe doivent être équilibrés.
2. chaque ligne du second tableau représente un couple d'élèves :
   - une colonne d'identification (Nom/Prénom ou identifiant anonyme) de l'élève A,
   - une colonne d'identification (Nom/Prénom ou identifiant anonyme) de l'élève B,
   - et une colonne d'affinité (score entre -5 et +5). Les scores négatifs signifient que les élèves A et B ne doivent pas être dans la même classe, les scores positifs signifient qu'ils doivent être dans la même classe.

Si un algorithme d'optimisation de fonction de perte (ou fonction de score) est choisi, les contraintes dures peuvent avoir un poids élevé (e.g. 10) tandis que les contraintes souples ont un poids plus faible (e.g. 2).

L'utilisateur peut renseigner les deux tableaux en important un fichier CSV ou en remplissant un formulaire sur la page web.

## Contraintes de sortie

Les contraintes de sortie sont les quatre contraintes dures : nombre maximal d'élèves par classe, classe commune pour les options, équilibre des groupes de répartition, et équilibre des scores de comportement.

L'algorithme peut renvoyer trois classifications sous forme du tableau suivant :

- une ligne par élève avec une colonne d'identification (Nom/Prénom ou identifiant anonyme) et une colonne pour chaque classification (Proposition 1, Proposition 2, Proposition 3).
- Les trois colonnes Proposition contiennent des nombres entiers entre 1 et le nombre de classes.

L'utilisateur peut télécharger le résultat sous forme de fichier CSV ou copier-coller le tableau dans un tableur.

## Interface utilisateur

L'interface utilisateur doit être simple et intuitive. Elle doit permettre à l'utilisateur (typiquement un professeur de collège) de :

- Spécifier le nombre maximal d'élèves par classe et le nombre de classes,
- Importer les deux tableaux de contraintes depuis un fichier CSV ou remplir un formulaire,
- Lancer l'algorithme de regroupement,
- Visualiser les résultats sous forme de tableau,
- Télécharger le résultat sous forme de fichier CSV ou copier-coller le tableau dans un tableur.

Après importation, seul un aperçu des tableaux de contraintes est affiché à l'utilisateur, mais il doit pouvoir les visualiser entièrement dans une fenêtre modale si nécessaire.

Un bouton d'aide doit être présent. Un clic ouvre une fenêtre modale avec des explications sur l'utilisation de l'outil (conventions des tableaux de contrainte, remplissage ou importation des données, explication des poids) et des exemples de contraintes. Un bouton doit permettre d'envoyer un mail pour proposer des améliorations ou signaler des bugs.

Dans la V1, tous les paramètres de l'algorithme doivent être réglables simplement. Après quelques essais, certains paramètres seront fixés par défaut et seuls les paramètres les plus importants seront réglables par l'utilisateur.

## Exemple de contraintes d'entrée

Voici un exemple de contraintes d'entrée écrites en langage naturel et non formatée en tableau. L'algorithme décrit ci-dessus doit pouvoir satisfaire ces contraintes.

### Contraintes dures

- Les élèves doivent être répartis en 4 classes : 3A, 3B, 3C et 3D
- Les effectifs des classes doivent être à peu près égaux (2 élèves d’écart au maximum)
- Les garçons et les filles doivent être à peu près équitablement répartis dans les classes
- Les élèves faisant allemand en LV1 doivent être en 3A ou en 3B
- Les élèves faisant allemand en LV2 doivent être en 3C ou en 3D
- Les élèves ayant un PAP doivent être à peu près équitablement répartis dans les 4 classes
- Une des 4 classes ne doit contenir que des élèves faisant espagnol en LV2
- Les élèves faisant latin et espagnol doivent être à peu près équitablement répartis dans 2 ou 3 classes
- Les élèves faisant latin et allemand doivent être à peu près équitablement répartis dans 2 ou 3 classes
- Le total des points de comportement doit être à peu près le même dans chaque classe (moins de 5 points d’écart entre 2 classes)
- Les élèves ULIS doivent être dans la même classe. Cette classe peut contenir 1 ou 2 élèves de plus que les autres

### Contraintes souples

- MMaxence et LVince ne doivent pas être dans la même classe
- GGRoman et FKylian ne doivent pas être dans la même classe
- Parmis les élèves suivants : Bmaël, Rmathys, Tgabriel, Poctave et RLNathan, aucun ne doit se retrouver isolé des autres
- L’élève Dlylha doit avoir au moins un des élèves suivants dans sa classe : FNolhan, EElise mais aucun des élèves suivants : FHMadina, Ppaola
- Parmis les élèves suivants : VAUlysse, DFCosme, DCJuliette, Lzoé, Stom, Fkylian et MTom, aucun ne doit se retrouver isolé de tous les autres
- L’élève FCMalou doit avoir au moins un des élèves suivants dans sa classe : GAlice, Sléa, mais aucun des élèves suivants : FCHélya, Bfantine
- L’élève FHMadina ne doit avoir aucun des élèves suivants dans sa classe : Dlilah, Ppaola
- L’élève GAlice doit avoir au moins un des élèves suivants dans sa classe : FCMalou, Sléa, DFBlanche, Gpauline, Bmaïssa
- Les élèves Gpauline et Dtoscane doivent être dans la même classe
- L’élève Ppaola doit avoir au moins un des élèves suivants dans sa classe : FCMalou, GAlice, mais pas l’élève FHMadina
- L’élève DCJuliette doit avoir au moins un des élèves suivants dans sa classe : Lzoé, Stom, Fkylian, Mtom
- L’élève DFBlanche doit avoir au moins un des élèves suivants dans sa classe : Galice, Sléa, Bmaïssa
- L’élève MMaxence ne doit avoir aucun des élèves suivants dans sa classe : GGRoman, Menis, Lvalentin, SGermain
- L’élève PMGabin doit être dans la même classe que Ztristan mais pas dans la même classe que GGRoman
- L’élève Achloé doit avoir au moins un des élèves suivants dans sa classe : Hgwendoline, Pjade, VLéa
