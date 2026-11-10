# downcount-

A small, responsive countdown website. Create a named countdown, choose its end date and time, and share a unique link with friends.

## Pages

- **Home** (`#/`) — introduces Downcount and links to creating a countdown.
- **Create** (`#/create`) — enter an event name and local date/time.
- **Countdown** (`#/countdown/<name>`) — shows the live countdown and a copyable share link.

Countdown details are stored in the URL, so a shared link works without an account or a server-side database. The selected date/time is converted to a timestamp when the countdown is created.

## Run locally

Open `index.html` in a browser, or serve this folder with any static web server. For GitHub Pages, publish the repository root. The app uses hash-based routes, so it works on static hosting without special rewrite rules.
