# Momo Backend — MF Consulting

Fonction serverless Vercel qui connecte le chatbot Momo à l'API Claude (Anthropic).

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
cd ~/Desktop/momo-backend
vercel --prod
```

Vercel te donnera une URL de type `https://adia-backend-xxx.vercel.app`.

### 4. Ajouter la variable d'environnement

Dans le dashboard Vercel (vercel.com) :
- Ouvre ton projet sur Vercel
- Va dans **Settings → Environment Variables**
- Ajoute :
  - `ANTHROPIC_API_KEY` : ta clé API Anthropic (commence par `sk-ant-...`)
  - `RESEND_API_KEY` : clé Resend pour l'email de résumé de dossier
  - `NOTIFY_EMAIL` : adresse qui reçoit les contacts. Avec l'expéditeur par défaut
    `onboarding@resend.dev`, Resend n'autorise l'envoi **que vers l'adresse du compte Resend**.
  - `MAIL_FROM` *(recommandé)* : expéditeur sur un domaine vérifié chez Resend,
    par exemple `Momo <contact@mondomaine.fr>`. C'est ce qui fait sortir les mails du spam.
  - `EXTRA_ALLOWED_ORIGINS` *(optionnel, dev local)* : ex. `http://localhost:5500,http://127.0.0.1:5500`
  - Rate limiting partagé *(recommandé)* : installer l'intégration **Upstash Redis** depuis
    Vercel → Storage → Marketplace. Elle ajoute `KV_REST_API_URL` et `KV_REST_API_TOKEN`
    (ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Sans elle, un compteur
    en mémoire (moins fiable) est utilisé.
  - **Environment** : Production (et Preview si besoin)

Ne jamais commiter de clé : `.env*` est dans `.gitignore`.

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

Limites : 30 messages max, 1000 caractères par message utilisateur, 8 requêtes/min et 60/jour par IP,
300/jour au total. Seule l'origine `https://mohamed-fof.github.io` est autorisée (CORS).

**Réponse** :
```json
{ "reply": "Bonjour ! Je suis Momo..." }
```
