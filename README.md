# Appartement Las Palmas, Coxyde

Site public de l'appartement (Résidence Las Palmas, Zeedijk 215, Koksijde) et page admin cachée
pour générer les conventions de location en PDF.

## Contenu

```
site/                 Fichiers publiés (100 % statique)
  index.html          Page publique
  js/photos.js        Liste des photos et légendes de la galerie
  photos/             Photos (hero.jpg + 01.jpg, 02.jpg, ...)
  admin/              Page admin protégée par mot de passe
    contrat.js        Mise en page du PDF (même texte que la convention actuelle)
infra/template.yaml   CloudFormation : S3 privé + CloudFront + fonction de protection /admin
deploy.sh             Déploiement en une commande
```

## Architecture AWS

- **S3** (privé, chiffré) contient les fichiers.
- **CloudFront** sert le site en HTTPS (accès S3 via Origin Access Control).
- **CloudFront Function** demande un identifiant et un mot de passe sur `/admin/`
  (authentification HTTP basique) et sert `index.html` pour les dossiers.
- **Route 53 / ACM** (optionnel) pour un nom de domaine personnalisé.
- Le PDF est généré **dans le navigateur** (jsPDF) : aucun serveur, aucune base de données,
  les données des locataires ne quittent pas l'ordinateur.

Coût : quelques centimes par mois.

## Déployer

Prérequis : AWS CLI configurée sur le bon compte.

Premier déploiement (choisir le mot de passe de la page admin) :

```bash
ADMIN_PASSWORD='mot-de-passe' ./deploy.sh
```

Mises à jour suivantes (photos, textes) :

```bash
./deploy.sh
```

Avec un nom de domaine (certificat ACM à créer d'abord en **us-east-1**) :

```bash
DOMAIN_NAME=www.exemple.be CERTIFICATE_ARN=arn:aws:acm:us-east-1:... HOSTED_ZONE_ID=Z123... ./deploy.sh
```

Le script affiche à la fin l'adresse du site et de la page admin.
La page admin demande seulement le mot de passe (pas d'identifiant). Il est mémorisé un an dans le navigateur.
Éviter les guillemets et barres obliques inverses dans le mot de passe.

## Utiliser la page admin

1. Aller sur `https://<site>/admin/` et se connecter.
2. Remplir le locataire, les dates et le prix. L'aperçu du PDF se met à jour en direct.
3. **Télécharger le PDF**, puis **Préparer l'e-mail au locataire** (ouvre la messagerie avec
   un texte prêt ; il reste à joindre le PDF).

Les coordonnées de la propriétaire, l'adresse de l'appartement et l'IBAN sont pré-remplis
(section repliable) et les 30 derniers contrats sont mémorisés dans le navigateur pour être rouverts.

## Ajouter des photos

Déposer les fichiers dans `site/photos/` (`hero.jpg` pour la grande photo d'accueil,
`01.jpg`, `02.jpg`, ... pour la galerie), adapter les légendes dans `site/js/photos.js`,
puis lancer `./deploy.sh`.

## Tester en local

```bash
cd site && python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000 et http://localhost:8000/admin/ (pas de mot de passe en local).
