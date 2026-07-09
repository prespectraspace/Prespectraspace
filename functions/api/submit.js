export async function onRequestPost(context) {
  const { request, env } = context;

  // Set CORS headers for local testing if needed
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const data = await request.json();
    const { name, email, phone, spaceSize, details } = data;

    // Basic Validation
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and Email are required fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientEmail = env.FORWARD_TO_EMAIL || "scans@prespectraspace.com";
    let sentSuccessfully = false;
    let providerUsed = "";
    let errorDetails = "";

    // 1. TELEGRAM INTEGRATION
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      providerUsed = "Telegram";
      const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const text = `✉️ *New Scan Request*\n\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n📞 *Phone:* ${phone || "N/A"}\n📐 *Space Size:* ${spaceSize || "N/A"}\n📝 *Details:* ${details || "N/A"}`;
      
      const telRes = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: "Markdown",
        }),
      });

      if (telRes.ok) {
        sentSuccessfully = true;
      } else {
        errorDetails += `Telegram failed: ${await telRes.text()}. `;
      }
    }

    // 2. RESEND EMAIL INTEGRATION
    if (!sentSuccessfully && env.RESEND_API_KEY) {
      providerUsed = "Resend";
      // If they haven't verified their domain on Resend, they must send from onboarding@resend.dev
      const fromEmail = env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Prespectra Form <${fromEmail}>`,
          to: recipientEmail,
          subject: `New Lead: ${name} - Prespectra Space`,
          html: `
            <h3>New Scan Request</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || "N/A"}</p>
            <p><strong>Space Size:</strong> ${spaceSize || "N/A"}</p>
            <p><strong>Details:</strong> ${details || "N/A"}</p>
          `,
        }),
      });

      if (resendRes.ok) {
        sentSuccessfully = true;
      } else {
        errorDetails += `Resend failed: ${await resendRes.text()}. `;
      }
    }

    // 3. MAILCHANNELS FALLBACK (Free SMTP Relay inside Cloudflare network)
    if (!sentSuccessfully) {
      providerUsed = "Mailchannels";
      const mcRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: recipientEmail, name: "Prespectra Space" }],
            },
          ],
          from: {
            email: "no-reply@prespectra-space.com",
            name: "Prespectra Space website",
          },
          subject: `New Lead: ${name} - Prespectra Space`,
          content: [
            {
              type: "text/html",
              value: `
                <h3>New Scan Request</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || "N/A"}</p>
                <p><strong>Space Size:</strong> ${spaceSize || "N/A"}</p>
                <p><strong>Details:</strong> ${details || "N/A"}</p>
              `,
            },
          ],
        }),
      });

      if (mcRes.ok) {
        sentSuccessfully = true;
      } else {
        errorDetails += `Mailchannels failed: ${await mcRes.text()}. `;
      }
    }

    if (sentSuccessfully) {
      return new Response(
        JSON.stringify({ success: true, provider: providerUsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "Failed to dispatch form submission.",
          details: errorDetails,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error parsing payload.", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
