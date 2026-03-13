export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, from, body, accountSid, authToken } = req.body;

  if (!to || !from || !body || !accountSid || !authToken) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    );

    const data = await response.json();

    if (data.sid) {
      return res.status(200).json({ success: true, sid: data.sid });
    } else {
      return res.status(200).json({ success: false, error: data.message || "Twilio error" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
