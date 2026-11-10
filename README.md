# Downcount

Make a **live countdown** for the moments that matter, share it, or **embed it on your own website**. A tiny installable web app (PWA) — no accounts, no backend, everything stays on your device.

## Features

- **App-style experience** — installable to your home screen, bottom tab bar on phones, safe-area aware, full-screen standalone mode, works offline.
- **Truly live** — countdowns tick exactly on the second, resync when you come back to the tab, update across open tabs, and show the time in the browser title. Confetti when the moment arrives 🎉
- **Six looks** — Classic, Sunset, Ocean, Forest, Neon and Mono, plus an emoji per countdown, with a live preview while you create.
- **Share** — pick a look, then copy a **link** (or send via WhatsApp, X, email, SMS or the native share sheet).
- **Embed** — pick a look, size and whether to show the title, then copy an **iframe** or **script** snippet and paste it into any page.
- **Calendar** — download an `.ics` file for any countdown.
- **Edit, delete with undo, progress bar, total weeks/days/hours/minutes, full-screen mode.**
- **Reminders** — optional notification when a countdown ends.
- **Settings** — Auto/Light/Dark theme, install button, export / import / delete your data.

## Embedding

Open a countdown, tap **Share → Embed**, and copy the code. Two options:

```html
<!-- iframe -->
<iframe src="https://YOUR-SITE/#/embed?name=Trip&end=1799999999000&style=sunset&emoji=%E2%9C%88%EF%B8%8F"
        width="100%" height="310" style="border:0;max-width:640px;border-radius:20px"></iframe>

<!-- or script (inserts the iframe right where the tag is) -->
<script async src="https://YOUR-SITE/embed.js" data-name="Trip" data-end="1799999999000"
        data-style="sunset" data-emoji="✈️" data-title="1" data-size="wide"></script>
```

Options: `style` = `classic | sunset | ocean | forest | neon | mono`, `size` = `wide | compact`, `title` = `1 | 0`. `end` is a Unix timestamp in milliseconds.

The app must be hosted somewhere public (for example GitHub Pages) for embeds to work on other sites.

## Run it

It's static files — serve the folder with any web server, e.g. `npx serve .`, or enable GitHub Pages on the `main` branch.
