// api/send-sms.js
// Vercel Serverless Function — Twilio SMS Relay
// Deploy this to Vercel. It keeps Twilio credentials server-side (never exposed to browser).
//
// Environment variables to set in Vercel dashboard:
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY
//
// Client Twilio credentials are stored per-user in Supabase (encrypted at rest).

const twilio = require("twilio");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // 1. Authenticate the request — verify the user's session token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];

    // Verify with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid session" });

    // 2. Load this user's Twilio credentials from Supabase
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("twilio_sid, twilio_token, twilio_from, business_name")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.twilio_sid) {
      return res.status(400).json({ error: "Twilio not configured for this account" });
    }

    // 3. Parse the request body
    const { messages } = req.body; // Array of { to, body }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }
    if (messages.length > 500) {
      return res.status(400).json({ error: "Max 500 messages per request" });
    }

    // 4. Send via Twilio
    const client = twilio(profile.twilio_sid, profile.twilio_token);
    const results = [];

    for (const msg of messages) {
      // Basic phone validation
      const phone = String(msg.to || "").replace(/\D/g, "");
      if (phone.length < 10) {
        results.push({ to: msg.to, status: "failed", error: "Invalid phone number" });
        continue;
      }
      const formattedPhone = phone.startsWith("1") ? `+${phone}` : `+1${phone}`;

      try {
        const sent = await client.messages.create({
          body: msg.body,
          from: profile.twilio_from,
          to: formattedPhone,
        });
        results.push({ to: msg.to, status: "sent", sid: sent.sid });
      } catch (err) {
        results.push({ to: msg.to, status: "failed", error: err.message });
      }

      // Small delay to respect Twilio rate limits (1 msg/sec on trial accounts)
      await new Promise(r => setTimeout(r, 100));
    }

    // 5. Log campaign to Supabase
    await supabase.from("campaigns").insert({
      user_id: user.id,
      sent_count: results.filter(r => r.status === "sent").length,
      failed_count: results.filter(r => r.status === "failed").length,
      total_count: results.length,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, results });

  } catch (err) {
    console.error("SMS send error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
