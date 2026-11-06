# PlexMatch

Pick 2-5 things from your Plex library each; if you and your wife pick the same title, it's a match and that's what you watch.

## Structure
- `server/` — Node/Express API that talks to your Plex server and tracks the current round's picks.
- `client/` — React + Vite PWA (installable on both phones via "Add to Home Screen").

## Local development
```bash
cd server && npm install && cp .env.example .env   # fill in PLEX_URL and PLEX_TOKEN
npm run dev
```
```bash
cd client && npm install
npm run dev
```
Open the client dev URL printed in the terminal (e.g. `http://<your-pc-ip>:5173`) from your phone, on the same Wi-Fi.

## Deploying on your homelab (alongside Plex)
```bash
cp server/.env.example server/.env   # fill in PLEX_URL and PLEX_TOKEN
docker compose up -d --build
```
- API: `http://<homelab-ip>:4100`
- App: `http://<homelab-ip>:4101`

## Installing on your phones
1. Open `http://plexmatch.home` (or `http://<homelab-ip>:4101` if off Pi-hole DNS) in Chrome (Android) or Safari (iPhone).
2. Tap the browser menu → "Add to Home Screen" / "Install app".
3. It now opens full-screen like a native app, with its own icon.

## How it works
- Each person taps their name, browses the library, and picks 1-5 titles.
- Once both people have submitted, the app shows the overlap.
- "Start new round" clears both sets of picks so you can try again.
