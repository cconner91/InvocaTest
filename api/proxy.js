// Receives the form POST, logs it, then forwards to Invoca's form fill endpoint.
// Set INVOCA_ENDPOINT and INVOCA_API_TOKEN in your Vercel project's Environment Variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const endpoint = process.env.INVOCA_ENDPOINT;
  if (!endpoint) {
    return res.status(500).json({ error: "INVOCA_ENDPOINT env var not set" });
  }

  const payload = req.body;

  console.log("[proxy] received payload:", JSON.stringify(payload, null, 2));

  const digits = payload.phone.replace(/\D/g, "");
  const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`;

const invocaPayload = {
  occurred_at: new Date().toISOString(),

  event_data: {
    name: payload.name || `${payload.first_name} ${payload.last_name}`.trim(),
    form_name: "lead inquiry - parts v1",
    first_name: payload.first_name,
    last_name: payload.last_name,

    email_address: payload.email,
    phone_number: e164,
    sms_consent: payload.sms_consent,
    invoca_attribution_id: payload.invoca_attribution_id,
  },
};

  console.log("[proxy] forwarding to Invoca:", JSON.stringify(invocaPayload, null, 2));

  const headers = { "Content-Type": "application/json" };
  if (process.env.INVOCA_API_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.INVOCA_API_TOKEN}`;
  }

  try {
    const invocaRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(invocaPayload),
    });

    const responseBody = await invocaRes.text().catch(() => "");

    console.log("[proxy] Invoca response:", invocaRes.status, responseBody);

    if (!invocaRes.ok) {
      return res.status(invocaRes.status).json({
        error: "Invoca endpoint returned an error",
        status: invocaRes.status,
        body: responseBody,
      });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("[proxy] fetch error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
