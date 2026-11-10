# downcount-

A small, responsive countdown website and installable Progressive Web App (PWA). Create a named countdown, choose its end date and time, and share a link with friends.

## Pages

- **Home** (`#/`) — introduces Downcount and links to creating a countdown.
- **Create** (`#/create`) — enter an event name and local date/time.
- **Countdown** (`#/countdown/<name>`) — shows the live countdown and a copyable share link.

Countdown details are stored in the URL, so shared links work without an account or server-side database.

## Install Downcount as an app

The site can be installed from a compatible browser and then opened from your device's home screen or app launcher. On desktop browsers, use the **Install app** button when it appears, or choose **Install app** from the browser menu. On iPhone/iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**.

For installation and offline support, host the site over HTTPS (GitHub Pages does this automatically). Opening `index.html` directly as a `file://` URL is fine for trying the website, but browsers do not allow PWA installation or service workers from local files.

## Run locally

Serve this folder with a static web server, then open its local HTTP URL. The hash-based routes work on static hosting without special rewrite rules.
