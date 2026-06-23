# Icone Technology Quality Control System

Système complet de validation de checklist pour modèles de récepteurs satellite et firmware, avec interface pour IT Support et administration.

## 🏗️ Architecture
- **Frontend** : React + Vite
- **Backend** : Node.js + Express + Socket.io
- **Base de données** : PostgreSQL

## 🚀 Démarrage rapide (Développement local)
1. Assurez-vous d'avoir Node.js et PostgreSQL installés
2. Créez une base de données PostgreSQL nommée `Icone`
3. Configurez les variables d'environnement dans `backend/.env` (utilisez le modèle déjà présent)
4. Installez les dépendances :
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```
5. Démarrez le projet :
   ```bash
   npm run dev
   ```

## 📝 Comptes par défaut
- **Admin** :
  - Username : `admin`
  - Mot de passe : `admin123`
- **IT Support** :
  - Username : `mohcene`
  - Mot de passe : `mohcene123`

## 🌐 Déploiement sur Render
Voir le fichier `DEPLOYMENT.md` pour le guide complet étape par étape.

## 📋 Fonctionnalités
- Gestion des modèles (ajout, modification, suppression)
- Gestion du firmware (ajout, modification, suppression)
- Évaluation des modèles avec checklist
- Évaluation du firmware avec checklist
- Validation par l'admin
- Historique complet des évaluations
- Chat en temps réel entre IT Support et admin
- Export PDF des rapports d'évaluation
- Mode sombre / clair
