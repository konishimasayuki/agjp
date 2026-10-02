// 発注書・請求書のメール送信（Resend）
export async function POST(req) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return Response.json({ ok: false, reason: 'not_configured' });
  try {
    const { to, cc, subject, html, text } = await req.json();
    if (!to) return Response.json({ ok: false, reason: '宛先がありません' }, { status: 400 });
    const bcc = process.env.MAIL_BCC;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], ...(cc ? { cc: [cc] } : {}), ...(bcc ? { bcc: [bcc] } : {}),
        reply_to: process.env.MAIL_REPLY_TO || undefined, subject, html, text,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ ok: false, reason: j.message || '送信エラー' }, { status: 502 });
    return Response.json({ ok: true, id: j.id });
  } catch (e) {
    return Response.json({ ok: false, reason: String(e.message || e) }, { status: 500 });
  }
}
