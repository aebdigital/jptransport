const SMTP2GO_ENDPOINT = "https://api.smtp2go.com/v3/email/send";

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

function clean(value = "") {
  return String(value).replace(/[\r\n]/g, " ").trim();
}

function escapeHtml(value = "") {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function replyToValue(name, email) {
  const displayName = clean(name).replace(/[<>"']/g, "");
  return displayName ? `${displayName} <${email}>` : email;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, message: "Method not allowed." });
  }

  const apiKey = process.env.SMTP2GO_API_KEY;
  const sender = process.env.SMTP2GO_SENDER;
  const recipient = process.env.CONTACT_FORM_RECIPIENT;

  if (!apiKey || !sender || !recipient) {
    return json(500, { ok: false, message: "Contact form is not configured." });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, message: "Invalid request body." });
  }

  const name = clean(data.name);
  const email = clean(data.email).toLowerCase();
  const phone = clean(data.phone);
  const service = clean(data.service || "Nezáväzná ponuka");
  const message = clean(data.message);

  if (!name || name.length < 2) {
    return json(400, { ok: false, message: "Zadajte prosím meno." });
  }

  if (!isEmail(email)) {
    return json(400, { ok: false, message: "Zadajte prosím platný email." });
  }

  if (!message || message.length < 8) {
    return json(400, { ok: false, message: "Napíšte prosím krátku správu k sťahovaniu." });
  }

  const subject = `Nový dopyt zo stahovanie-24.sk - ${service}`;
  const textBody = [
    "Nový dopyt z webu Sťahovanie 24/7",
    "",
    `Meno: ${name}`,
    `Email: ${email}`,
    `Telefón: ${phone || "Neuvedené"}`,
    `Služba: ${service}`,
    "",
    "Správa:",
    message,
  ].join("\n");

  const htmlBody = `
    <h2>Nový dopyt z webu Sťahovanie 24/7</h2>
    <p><strong>Meno:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Telefón:</strong> ${escapeHtml(phone || "Neuvedené")}</p>
    <p><strong>Služba:</strong> ${escapeHtml(service)}</p>
    <p><strong>Správa:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  try {
    const response = await fetch(SMTP2GO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Smtp2go-Api-Key": apiKey,
      },
      body: JSON.stringify({
        api_key: apiKey,
        sender,
        to: [recipient],
        subject,
        text_body: textBody,
        html_body: htmlBody,
        custom_headers: [
          {
            header: "Reply-To",
            value: replyToValue(name, email),
          },
        ],
      }),
    });

    const result = await response.json().catch(() => ({}));
    const succeeded = result?.data?.succeeded;

    if (!response.ok || succeeded === 0) {
      return json(502, {
        ok: false,
        message: "Email sa nepodarilo odoslať. Skúste prosím zavolať.",
      });
    }

    return json(200, { ok: true, message: "Ďakujeme, správa bola odoslaná." });
  } catch {
    return json(502, {
      ok: false,
      message: "Email sa nepodarilo odoslať. Skúste prosím zavolať.",
    });
  }
};
