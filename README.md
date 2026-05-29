# ADIA Backend — MF Consulting

Fonction serverless Vercel qui connecte le chatbot ADIA à l'API Claude (Anthropic).

## Déploiement sur Vercel

### 1. Installer Vercel CLI (si pas déjà fait)
```bash
npm install -g vercel
```

### 2. Se connecter à Vercel
```bash
vercel login
```

### 3. Déployer
```bash
cd ~/Desktop/adia-backend
vercel --prod
```

Vercel te donnera une URL de type `https://adia-backend-xxx.vercel.app`.

### 4. Ajouter la variable d'environnement

Dans le dashboard Vercel (vercel.com) :
- Ouvre ton projet `adia-backend`
- Va dans **Settings → Environment Variables**
- Ajoute :
  - **Name** : `ANTHROPIC_API_KEY`
  - **Value** : ta clé API Anthropic (commence par `sk-ant-...`)
  - **Environment** : Production

Puis redéploie :
```bash
vercel --prod
```

### 5. Mettre à jour le portfolio

Dans `index.html`, remplace l'URL du fetch par celle de ton déploiement :
```
https://adia-backend-xxx.vercel.app/api/chat
```

## Endpoint

`POST /api/chat`

**Body** :
```json
{ "messages": [{ "role": "user", "content": "Bonjour" }] }
```

**Réponse** :
```json
{ "reply": "Bonjour ! Je suis ADIA..." }
```
