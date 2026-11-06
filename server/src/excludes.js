import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "..", "excludes.json");

function load() {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function save(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = load();

export function getExcludes(user) {
  return state[user] || [];
}

export function addExclude(user, item) {
  if (!state[user]) state[user] = [];
  if (!state[user].some((i) => i.ratingKey === item.ratingKey)) {
    state[user].push(item);
  }
  save(state);
  return state[user];
}

export function removeExclude(user, ratingKey) {
  if (state[user]) {
    state[user] = state[user].filter((i) => i.ratingKey !== ratingKey);
  }
  save(state);
  return state[user] || [];
}
