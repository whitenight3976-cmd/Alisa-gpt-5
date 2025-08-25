export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const version = data?.version ?? '1.0';
    const userQuery = data?.request?.original_utterance ?? '';

    if (!userQuery?.trim()) {
      return res.status(200).json({ version, response: { text: 'Скажи, чем я могу помочь?', end_session: false } });
    }

    const oaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'Ты помощник для голосового навыка Алисы. Отвечай кратко и по делу.' },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7
      })
    });

    if (!oaiResp.ok) {
      console.error('OpenAI error:', await oaiResp.text());
      return res.status(200).json({ version, response: { text: 'Сервис ответа сейчас недоступен. Попробуй ещё раз.', end_session: false } });
    }

    const oaiJson = await oaiResp.json();
    let answer = oaiJson?.choices?.[0]?.message?.content?.trim() || 'Не уверена. Давай попробуем переформулировать вопрос?';
    if (answer.length > 900) answer = answer.slice(0, 900) + '…';

    return res.status(200).json({ version, response: { text: answer, end_session: false } });
  } catch (e) {
    console.error('Handler error:', e);
    return res.status(200).json({ version: '1.0', response: { text: 'Произошла ошибка при обработке запроса.', end_session: false } });
  }
}
