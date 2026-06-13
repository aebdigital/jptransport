# SMTP2GO Contact Form Setup

This project sends contact form submissions through a Netlify Function:

- Form UI: `src/components/ContactPanel.tsx`
- Function: `netlify/functions/contact.js`
- Endpoint used by the form: `/api/contact`
- Redirect to function: `netlify.toml`

## Environment Variables

Set these in Netlify Site settings > Environment variables:

```bash
CONTACT_FORM_RECIPIENT=recipient@example.com
SMTP2GO_API_KEY=your-smtp2go-api-key
SMTP2GO_SENDER="Sťahovanie 24/7 <no-reply@your-domain.sk>"
```

`SMTP2GO_SENDER` must be a sender/domain approved in SMTP2GO.

## Reply-To

The function sends SMTP2GO `custom_headers` with:

```json
[
  {
    "header": "Reply-To",
    "value": "Visitor Name <visitor@example.com>"
  }
]
```

That means replies in the inbox should go to the person who submitted the form.

## Local Testing

Use Netlify Dev for local function testing:

```bash
netlify dev
```

Plain `next dev` serves the website, but it does not run Netlify Functions.
