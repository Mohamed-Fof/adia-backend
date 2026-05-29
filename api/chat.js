export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://mohamed-fof.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

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
      max_tokens: 1024,
      system: `Tu es ADIA, l'agent virtuel de Mohamed Fofana (MF Consulting). Tu aides les étudiants internationaux qui veulent étudier en France. Tu es chaleureux, professionnel et tu parles en français. Tu poses des questions pour comprendre leur situation : pays d'origine, niveau d'études, université visée. Tu expliques les services : dossier Campus France, lettre de motivation, préparation entretien, visa. Tu invites à contacter Mohamed via fofana12ad@gmail.com pour un accompagnement personnalisé. Ne réponds qu'aux questions liées aux études en France.`,
      messages: messages
    })
  });

  const data = await response.json();
  res.status(200).json({ reply: data.content[0].text });
}
