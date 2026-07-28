module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://mohamed-fof.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const { messages } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        system: `Tu es Momo, l'agent virtuel de Mohamed Fofana (MF Consulting). Tu aides les étudiants internationaux qui souhaitent étudier en France. Tu es chaleureux, encourageant et professionnel. Tu parles uniquement en français.

ÉTAPE 1 — Première question uniquement :
Demande le Prénom et Nom complet de l'étudiant.

ÉTAPE 2 — Dès que tu as le prénom et le nom, envoie UN SEUL message avec TOUTES les questions suivantes sous forme de liste numérotée :
1. Numéro WhatsApp (avec indicatif pays, ex: +225 07 00 00 00)
2. Pays de résidence actuel
3. Établissement actuel (nom complet de l'école ou université)
4. Filière et niveau d'études actuel (ex: Licence 2 Mathématiques)
5. Projet d'études en France : filière souhaitée et établissements visés
6. Projet professionnel : métier ou domaine visé après les études
7. Budget disponible pour l'accompagnement MF Consulting (en euros ou francs CFA)
8. Moyennes générales des 3 dernières années (format : Année — Moyenne)
9. Démarches Campus France déjà effectuées ? (oui/non, précise lesquelles si oui)

ÉTAPE 3 — Quand l'étudiant a répondu à toutes les questions :
a) Remercie-le chaleureusement pour le temps consacré et sa confiance
b) Informe-le que Mohamed Fofana (MF Consulting) le contactera très prochainement sur WhatsApp
c) Génère le résumé en commençant EXACTEMENT par : 📋 RÉSUMÉ DOSSIER:
   Puis le tableau en format markdown avec des pipes EXACTEMENT comme ceci :
   | Informations | Détails |
   |---|---|
   | Nom complet | [valeur] |
   | WhatsApp | [valeur] |
   | Pays de résidence | [valeur] |
   | Établissement actuel | [valeur] |
   | Filière / Niveau | [valeur] |
   | Projet d'études en France | [valeur] |
   | Projet professionnel | [valeur] |
   | Budget | [valeur] |
   | Moyennes | [valeur] |
   | Démarches Campus France | [valeur] |
d) Termine EXACTEMENT par : [DOSSIER_COMPLET]

Règles :
- Ne réponds qu'aux sujets liés aux études en France et à MF Consulting
- Si l'étudiant pose une question hors sujet, redirige-le poliment`,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Erreur API Anthropic' });
    }

    const reply = data.content[0].text;

    // Quand le questionnaire est terminé, envoyer un email de résumé
    if (reply.includes('[DOSSIER_COMPLET]') && process.env.RESEND_API_KEY) {
      const cleanReply = reply.replace('[DOSSIER_COMPLET]', '').trim();

      // Extraire le résumé structuré
      const resumeMatch = cleanReply.match(/📋 RÉSUMÉ DOSSIER:([\s\S]*)/);
      const resumeRaw = resumeMatch ? resumeMatch[1].trim() : cleanReply;

      // Convertir tableau markdown en HTML
      const resumeHtml = resumeRaw.split('\n').reduce((acc, line) => {
        if (/^\s*\|[\s\-|:]+\|\s*$/.test(line)) return acc;
        if (!line.trim().startsWith('|')) return acc + `<p style="margin:4px 0;color:#374151;">${line}</p>`;
        const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        const isHeader = acc.indexOf('<table') === -1;
        if (isHeader) {
          return acc + `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;"><thead><tr>${cells.map(c => `<th style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:10px 14px;text-align:left;">${c}</th>`).join('')}</tr></thead><tbody>`;
        }
        return acc + `<tr>${cells.map((c, i) => `<td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;background:${i===0?'#f9fafb':'#fff'}">${c}</td>`).join('')}</tr>`;
      }, '') + (resumeRaw.includes('|') ? '</tbody></table>' : '');

      // Construire la conversation HTML
      const conversationHtml = messages.map(m => {
        const isUser = m.role === 'user';
        return `<div style="margin:12px 0;padding:12px 16px;border-radius:10px;background:${isUser ? '#eff6ff' : '#f5f3ff'};border-left:4px solid ${isUser ? '#2563eb' : '#7c3aed'};">
          <div style="font-size:12px;font-weight:700;color:${isUser ? '#2563eb' : '#7c3aed'};margin-bottom:6px;">${isUser ? '👤 ÉTUDIANT' : '🤖 Momo'}</div>
          <div style="font-size:14px;color:#374151;white-space:pre-wrap;">${m.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        </div>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:680px;margin:0 auto;background:#f3f4f6;padding:20px;">
  <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">📋 Nouveau dossier étudiant</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">MF Consulting — Reçu via Momo</p>
    </div>
    <div style="padding:28px 32px;">
      <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 16px;">Résumé du dossier</h2>
      ${resumeHtml}
      <div style="margin-top:32px;padding-top:24px;border-top:2px solid #e5e7eb;">
        <h2 style="color:#1e3a5f;font-size:16px;margin:0 0 16px;">Conversation complète</h2>
        ${conversationHtml}
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:12px;color:#9ca3af;">
      MF Consulting · fofana12ad@gmail.com · Mohamed-Fof.github.io
    </div>
  </div>
</body>
</html>`;

      const textFallback = `Nouveau dossier MF Consulting\n\nRÉSUMÉ :\n${resumeRaw}\n\nCONVERSATION :\n${messages.map(m => `${m.role === 'user' ? 'ÉTUDIANT' : 'Momo'} : ${m.content}`).join('\n\n')}`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Momo <onboarding@resend.dev>',
          to: ['fofanamhd12@icloud.com'],
          subject: 'Nouveau dossier etudiant - MF Consulting',
          html,
          text: textFallback
        })
      });

      const emailData = await emailRes.json();
      const emailOk = emailRes.ok;
      return res.status(200).json({ reply: cleanReply, completed: true, emailOk, emailError: emailOk ? null : emailData });
    }

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
