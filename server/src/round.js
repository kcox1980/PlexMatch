import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getSections, getSectionItems } from "./plex.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "..", "round-state.json");

export const USERS = ["kevin", "kelita"];

function emptyRound() {
  return {
    id: Date.now(),
    picks: { kevin: null, kelita: null },
  };
}

function load() {
  if (!existsSync(STATE_FILE)) return emptyRound();
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return emptyRound();
  }
}

function save(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = load();

function isGenrePick(pick) {
  return pick.type === "genre";
}

let genreSuggestionCache = null;

async function allLibraryItems() {
  if (genreSuggestionCache) return genreSuggestionCache;
  const sections = await getSections();
  const lists = await Promise.all(sections.map((s) => getSectionItems(s.key)));
  genreSuggestionCache = lists.flat();
  return genreSuggestionCache;
}

async function suggestForGenre(genre) {
  const items = await allLibraryItems();
  const candidates = items.filter((i) => (i.genres || []).includes(genre));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return candidates[0];
}

async function computeMatches(picksKevin, picksKelita) {
  const itemsA = picksKevin.filter((p) => !isGenrePick(p));
  const itemsB = picksKelita.filter((p) => !isGenrePick(p));
  const genresA = picksKevin.filter(isGenrePick).map((p) => p.genre);
  const genresB = picksKelita.filter(isGenrePick).map((p) => p.genre);

  const matches = [];
  const seenKeys = new Set();

  function addMatch(item, matchType, genre) {
    if (seenKeys.has(item.ratingKey)) return;
    seenKeys.add(item.ratingKey);
    matches.push({ ...item, matchType, ...(genre ? { genre } : {}) });
  }

  const bKeys = new Set(itemsB.map((i) => i.ratingKey));
  for (const item of itemsA) {
    if (bKeys.has(item.ratingKey)) addMatch(item, "exact");
  }

  for (const item of itemsA) {
    const hit = (item.genres || []).find((g) => genresB.includes(g));
    if (hit) addMatch(item, "genre", hit);
  }
  for (const item of itemsB) {
    const hit = (item.genres || []).find((g) => genresA.includes(g));
    if (hit) addMatch(item, "genre", hit);
  }

  const sharedGenres = [...new Set(genresA.filter((g) => genresB.includes(g)))];
  for (const genre of sharedGenres) {
    const suggestion = await suggestForGenre(genre);
    if (suggestion && !seenKeys.has(suggestion.ratingKey)) {
      seenKeys.add(suggestion.ratingKey);
      matches.push({ ...suggestion, matchType: "suggested", genre });
    }
  }

  return matches;
}

export async function getRound() {
  const bothIn = state.picks.kevin && state.picks.kelita;
  let matches = [];
  if (bothIn) {
    matches = await computeMatches(state.picks.kevin, state.picks.kelita);
  }
  return { id: state.id, picks: state.picks, bothIn, matches };
}

export async function submitPicks(user, items) {
  if (!USERS.includes(user)) throw new Error("Unknown user");
  state.picks[user] = items;
  save(state);
  return getRound();
}

export async function resetRound() {
  state = emptyRound();
  genreSuggestionCache = null;
  save(state);
  return getRound();
}
