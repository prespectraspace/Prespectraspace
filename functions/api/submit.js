export async function onRequestPost(context) {
  const { request } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const data = await request.json();
    const { name, email, phone, spaceSize, details } = data;

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and Email are required fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const textContent = `New Website Inquiry Details:\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone || 'N/A'}\n` +
      `Space Size: ${spaceSize || 'N/A'}\n\n` +
      `Details/Requests:\n${details || 'N/A'}`;

    // Using Resend's onboarding API key to bypass strict domain locks for testing
    const resendPayload = {
      from: "onboarding@resend.dev",
      to: "prespectraspace@gmail.com",
      subject: `New Scan Quote Request from ${name}`,
      text: textContent,
      reply_to: email
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer re_is16VAs4_Kbe6wL7mK8Nbe9D7vA9u7BvX", // Resend Public Sandbox Testing Key
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resendPayload)
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: "Resend delivery failed.", details: errorText }),
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
