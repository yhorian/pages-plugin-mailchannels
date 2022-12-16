// Documentation for this plugin: https://developers.cloudflare.com/pages/platform/functions/plugins/mailchannels/
// Will capture anything from a form with a 'data-static-form-name' attribute
// For example: <form data-static-form-name="contact">

// Replace this with your own email, otherwise the Mailchannel API will reject it:
const myEmail = "example@example.com"

import mailChannelsPlugin from "@cardiff.marketing/pages-plugin-mailchannels";

// Required properties: "personalizations", "from", "respondWith".
// Optional Properties: "subject", "content". 
export const onRequest: PagesFunction = mailChannelsPlugin({personalizations: emailPersonalizations, from: emailFrom, subject: emailSubject,  respondWith: formResponse});

// Required. Must have "name" and "email" as below. The Mailchannel API will reject 'unsafe' email addresses. See their docs for more info.
function emailPersonalizations() {
  return [{to: [{ name: "Me", email: myEmail }],},]
}

// Required. Must contain name and email. The Mailchannel API will reject 'unsafe' email addresses. See their docs for more info.
function emailFrom(data) {
  return {name: `${ data.name } form`, email: myEmail}
}

// Required. Must be a Response object. This example is a redirect but any Response is valid.
// https://developer.mozilla.org/en-US/docs/Web/API/Response
function formResponse() {
  return Response.redirect('https://cardiff.marketing/about/', 302)
}

// "subject" is Optional. This is the default template in the package but I've copied it here to make it easier to edit.
function emailSubject(data) {
  return `${ data.name } form submission from: ` + data.formData.get("email")
}

// "content" is Optional. This is the default template in the package but I've copied it here to make it easier to edit.
function emailContent(data) {
  return `<!DOCTYPE html>
  <html>
    <body>
      <h1>New contact form submission</h1>
      <div>At ${new Date().toISOString()}, you received a new ${data.name} form submission from ${data.request.headers.get("CF-Connecting-IP")}:</div>
      <table>
      <tbody>
      ${[...data.formData.entries()].map(([field, value]) => `<tr><td><strong>${field}</strong></td><td>${value}</td></tr>`).join("\n")}
      </tbody>
      </table>
    </body>
  </html>`;
}
