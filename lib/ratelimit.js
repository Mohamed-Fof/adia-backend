// Limitation de débit pour /api/chat, pour protéger le crédit de l'API Anthropic.
// - Avec Upstash Redis (variables UPSTASH_REDIS_REST_* ou KV_REST_API_*) : compteurs partagés
//   entre toutes les instances serverless (recommandé en production).
// - Sans Redis : compteurs en mémoire, propres à chaque instance (protection partielle seulement).

const RULES = [
  { name: 'burst', scope: 'ip', limit: 8, windowMs: 60 * 1000 },
  { name: 'daily', scope: 'ip', limit: 60, windowMs: 24 * 60 * 60 * 1000 },
  { name: 'global', scope: 'global', limit: 300, windowMs: 24 * 60 * 60 * 1000 }
];

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let limiters = null;
if (redisUrl && redisToken) {
  const { Ratelimit } = require('@upstash/ratelimit');
  const { Redis } = require('@upstash/redis');
  // retry: false -> en cas de panne Redis, on bascule tout de suite sur la mémoire au lieu d'attendre.
  const redis = new Redis({ url: redisUrl, token: redisToken, retry: false });
  limiters = RULES.map(rule => ({
    rule,
    rl: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(rule.limit, `${rule.windowMs} ms`),
      prefix: `momo:${rule.name}`
    })
  }));
} else {
  console.warn('Rate limit : Upstash non configuré, repli sur un compteur en mémoire (protection partielle).');
}

const memory = new Map();

function memoryHit(key, rule) {
  const now = Date.now();
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.reset <= now) memory.delete(k);
  }
  const entry = memory.get(key);
  if (!entry || entry.reset <= now) {
    memory.set(key, { count: 1, reset: now + rule.windowMs });
    return { success: true, reset: now + rule.windowMs };
  }
  entry.count++;
  return { success: entry.count <= rule.limit, reset: entry.reset };
}

async function hit(rule, rl, ip) {
  const id = rule.scope === 'ip' ? ip : 'all';
  if (rl) {
    try {
      const { success, reset } = await rl.limit(id);
      return { success, reset };
    } catch (err) {
      console.error('Rate limit : Upstash indisponible, repli sur la mémoire :', err.name);
    }
  }
  return memoryHit(`${rule.name}:${id}`, rule);
}

// Renvoie { ok: true } ou { ok: false, retryAfter } (secondes).
async function checkRateLimit(ip) {
  for (const rule of RULES) {
    const rl = limiters && limiters.find(l => l.rule === rule).rl;
    const { success, reset } = await hit(rule, rl, ip);
    if (!success) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
    }
  }
  return { ok: true };
}

module.exports = { checkRateLimit };
