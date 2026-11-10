# downcount-

A responsive countdown website and installable Progressive Web App (PWA). Create a countdown, personalize it, and share it with friends.

## Features

- Home, create, and countdown pages with shareable links
- Saved countdown list stored locally on the device
- Quick date presets, copy link, and native sharing where supported
- Light/dark theme toggle
- Install prompt and app-style standalone display
- Offline app shell and saved countdowns after the first visit
- Optional end-time browser notification reminders

## Install Downcount

Serve the site over HTTPS (GitHub Pages is supported) and open it in a compatible browser. Use **Install app** when offered, or the browser's **Install app / Add to Home Screen** menu. On iPhone/iPad, use Safari's **Share → Add to Home Screen**. The browser builds the app launch screen from the PWA manifest on supported platforms.

## Notifications limitation

Notifications require permission and browser support. Use **Remind me** on a countdown to opt in. This simple static app can check reminders while Downcount is open (or when you return to it); reliable notifications when the app is fully closed require a push-notification server, which this repository does not include. Notifications may also be restricted by device/browser settings.

## Run locally

Serve this folder with a static web server. Opening `index.html` directly as a `file://` URL does not enable service workers, installation, or offline support. Hash-based routes work on static hosting without special rewrite rules.
