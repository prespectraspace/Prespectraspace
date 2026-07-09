export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight OPTIONS
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

    // Determine target inbox (using FORWARD_TO_EMAIL env or default scans@prespectra-space.com)
    const destinationEmail = env.FORWARD_TO_EMAIL || "scans@prespectra-space.com";

    // Format the plaintext form details for the value field
    const textContent = `New Website Inquiry Details:\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone || 'N/A'}\n` +
      `Space Size: ${spaceSize || 'N/A'}\n\n` +
      `Details/Requests:\n${details || 'N/A'}`;

    // Construct the MailChannels payload structure exactly as verified
    const mailChannelsPayload = {
      personalizations: [
        {
          to: [{ email: destinationEmail }],
          // If DKIM environment variables are set in Cloudflare, sign the email.
          // Otherwise, fall back safely without DKIM properties.
          ...(env.DKIM_PRIVATE_KEY ? {
            dkim_domain: env.DKIM_DOMAIN || "prespectra-space.com",
            dkim_selector: env.DKIM_SELECTOR || "mailchannels",
            dkim_private_key: env.DKIM_PRIVATE_KEY
          } : {})
        }
      ],
      from: {
        email: "noreply@prespectra-space.com",
        name: "Prespectra Form"
      },
      reply_to: {
        email: email // Dynamic reply-to from form submitter
      },
      subject: "New Website Inquiry",
      content: [
        {
          type: "text/plain",
          value: textContent
        }
      ]
    };

    const mcRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(mailChannelsPayload)
    });

    if (mcRes.ok) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await mcRes.text();
      return new Response(
        JSON.stringify({ error: "MailChannels failed to deliver.", details: errorText }),
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
