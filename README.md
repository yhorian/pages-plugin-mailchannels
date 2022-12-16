# MailChannels Pages Plugin for Cloudflare

This is a refactored version of the @cloudflare/pages-plugin-mailchannels plugin, which was based on the @cloudflare/pages-plugin-static-forms package.

[Original package documentation from Cloudflare.](https://developers.cloudflare.com/pages/platform/functions/plugins/mailchannels/)

Also fixed the bug that only returns 200 OK status codes.

## Installation

```sh
npm i --save https://github.com/yhorian/pages-plugin-mailchannels
```

## Usage

Copy the **_middleware.ts** file from this repository over to the /functions folder of your own repository. Cloudflare will then parse this into a Function when the page is compiled.

Don't forget to change the email inside the **_middleware.ts** to your own. It'll throw a **512:"Could not send your email. Please try again."** error otherwise.
```js
const myEmail = "example@example.com"
```

Once compiled by Cloudflare Pages, the Function will capture anything from a form with a 'data-static-form-name' attribute set, such as:
```html
<body>
  <h1>Contact us</h1>
  <form data-static-form-name="contact">
    <label>Name <input type="text" name="name" /></label>
    <label>Email address <input type="email" name="email" /></label>
    <label>Message <textarea name="message"></textarea></label>
    <button type="Submit">
  </form>
</body>
```

On form submit, you'll get an email from 'Contact form' with all the relevant data from the [Mailchannel API](https://mailchannels.zendesk.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Send-API). Some restrictions apply. A 512 error is generated every time the API rejects something as 'Spam'.

To use multiple middleware handlers, see this documentation on [Chaining middleware](https://developers.cloudflare.com/pages/platform/functions/middleware/).
