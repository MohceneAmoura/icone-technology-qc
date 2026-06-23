# Guide de Déploiement sur Render

Ce guide explique comment déployer l'application Icone Technology sur Render.

---

## 📋 Prérequis

1. Un compte sur Render (gratuit) : https://render.com/
2. Un compte GitHub/GitLab pour héberger le code source
3. Les fichiers de code source correctement configurés

---

## 🏗️ Étape 1 : Créer une base de données PostgreSQL sur Render

1. Connectez-vous à Render
2. Cliquez sur **"New +"** → **"PostgreSQL"**
3. Remplissez les informations :
   - **Name** : `icone-tech-db` (ou un nom de votre choix)
   - **Database** : `icone`
   - **User** : `icone_user`
   - **Region** : Choisissez la plus proche de vous (ex: EU West (Frankfurt) pour l'Europe)
   - **Plan** : Free
4. Cliquez sur **"Create Database"**
5. Une fois la base de données prête, allez dans l'onglet **"Connections"** et copiez la valeur de **"Internal Database URL"** et **"External Database URL"**

---

## 🚀 Étape 2 : Déployer le Backend sur Render

1. Cliquez sur **"New +"** → **"Web Service"**
2. Connectez votre compte GitHub/GitLab et sélectionnez votre dépôt
3. Configurez le service :
   - **Name** : `icone-tech-backend`
   - **Region** : Même région que votre base de données
   - **Branch** : `main` (ou la branche que vous voulez déployer)
   - **Root Directory** : `backend`
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free
4. Cliquez sur **"Advanced"** → **"Add Environment Variable"** et ajoutez :
   | Clé | Valeur |
   |-----|--------|
   | `PORT` | `10000` (Render utilise ce port par défaut) |
   | `DATABASE_URL` | Collez l'**Internal Database URL** de votre base de données PostgreSQL |
   | `JWT_SECRET` | Choisissez une chaîne de caractères sécurisée (ex: `votre_super_secret_key_icone_2026`) |
5. Cliquez sur **"Create Web Service"** et attendez que le déploiement termine (quelques minutes)
6. Copiez l'URL du backend (ex: `https://icone-tech-backend.onrender.com`)

---

## ✨ Étape 3 : Déployer le Frontend sur Render

1. Cliquez sur **"New +"** → **"Static Site"**
2. Sélectionnez votre dépôt GitHub/GitLab
3. Configurez le site :
   - **Name** : `icone-tech-frontend`
   - **Region** : Même région que votre backend
   - **Branch** : `main`
   - **Root Directory** : `frontend`
   - **Build Command** : `npm install && npm run build`
   - **Publish directory** : `dist`
4. Cliquez sur **"Advanced"** → **"Add Redirect/Rewrite Rule"** :
   - **Source** : `/*`
   - **Destination** : `/index.html`
   - **Action** : Rewrite
5. Cliquez sur **"Create Static Site"** et attendez le déploiement
6. Copiez l'URL du frontend (ex: `https://icone-tech-frontend.onrender.com`)

---

## 🔗 Étape 4 : Configurer le Proxy/Redirection API (Important !)

Pour que le frontend puisse communiquer avec le backend :

1. Allez sur le dashboard de votre **frontend static site** sur Render
2. Cliquez sur **"Redirects/Rewrites"**
3. Ajoutez une nouvelle règle :
   - **Source** : `/api/*`
   - **Destination** : `https://VOTRE_BACKEND_URL.onrender.com/api/:splat` (remplacez par l'URL de votre backend)
   - **Action** : Rewrite
4. Cliquez sur **"Save Changes"**

---

## 📦 (Optionnel) Initialiser la base de données avec des données de test

Si vous voulez exécuter les scripts SQL d'initialisation :
1. Utilisez un outil comme **pgAdmin** ou **DBeaver**
2. Connectez-vous avec l'**External Database URL** de Render
3. Exécutez les fichiers `schema.sql`, `checklist-seed.sql`, `checklist-firmware-seed.sql` et `seed.sql` depuis le dossier `backend`

---

## ✅ Vérification finale

1. Ouvrez l'URL de votre frontend
2. Connectez-vous avec le compte admin par défaut
3. Testez les fonctionnalités principales (modèles, firmware, validation, historique, etc.)

---

## 📝 Notes importantes

- Le plan gratuit de Render met en veille les services après 15 minutes d'inactivité, ils reprennent automatiquement lors d'une nouvelle requête
- Sauvegardez toujours vos variables d'environnement en lieu sûr
- Pour plus de sécurité, changez régulièrement votre `JWT_SECRET`
