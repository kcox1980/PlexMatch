const PLEX_URL = process.env.PLEX_URL;
const PLEX_TOKEN = process.env.PLEX_TOKEN;
const ALLOWED_LIBRARIES = (process.env.PLEX_LIBRARIES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!PLEX_URL || !PLEX_TOKEN) {
  throw new Error("PLEX_URL and PLEX_TOKEN must be set in server/.env");
}

async function plexFetch(path) {
  const url = new URL(path, PLEX_URL);
  url.searchParams.set("X-Plex-Token", PLEX_TOKEN);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Plex request failed (${res.status}): ${path}`);
  }
  return res.json();
}

export async function getSections() {
  const data = await plexFetch("/library/sections");
  const dirs = data.MediaContainer.Directory || [];
  return dirs
    .filter((d) => d.type === "movie" || d.type === "show")
    .filter((d) => ALLOWED_LIBRARIES.length === 0 || ALLOWED_LIBRARIES.includes(d.title))
    .map((d) => ({ key: d.key, title: d.title, type: d.type }));
}

export async function getSectionItems(key) {
  const data = await plexFetch(`/library/sections/${key}/all`);
  const items = data.MediaContainer.Metadata || [];
  return items.map((item) => ({
    ratingKey: item.ratingKey,
    title: item.title,
    titleSort: item.titleSort || item.title,
    year: item.year,
    summary: item.summary,
    type: item.type,
    duration: item.duration,
    rating: item.rating ?? item.audienceRating ?? null,
    genres: (item.Genre || []).map((g) => g.tag).slice(0, 3),
    thumb: item.thumb || item.art || null,
    viewCount: item.viewCount || 0,
  }));
}

export function plexImageUrl(thumbPath) {
  return `${PLEX_URL}${thumbPath}?X-Plex-Token=${PLEX_TOKEN}`;
}
