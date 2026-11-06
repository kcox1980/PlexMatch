import "dotenv/config";
import express from "express";
import cors from "cors";
import { getSections, getSectionItems, plexImageUrl } from "./plex.js";
import { getRound, submitPicks, resetRound, USERS } from "./round.js";
import { getExcludes, addExclude, removeExclude } from "./excludes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/sections", async (_req, res) => {
  try {
    res.json(await getSections());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sections/:key/items", async (req, res) => {
  try {
    res.json(await getSectionItems(req.params.key));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/image", async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).end();
  try {
    const upstream = await fetch(plexImageUrl(path));
    res.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/round", async (_req, res) => {
  res.json(await getRound());
});

app.post("/api/round/pick", async (req, res) => {
  const { user, items } = req.body;
  if (!USERS.includes(user) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid user or items" });
  }
  if (items.length > 5) {
    return res.status(400).json({ error: "Pick at most 5 items" });
  }
  const valid = items.every((i) => i.ratingKey || (i.type === "genre" && i.genre));
  if (!valid) {
    return res.status(400).json({ error: "Invalid item in picks" });
  }
  res.json(await submitPicks(user, items));
});

app.post("/api/round/reset", async (_req, res) => {
  res.json(await resetRound());
});

app.get("/api/excludes/:user", (req, res) => {
  if (!USERS.includes(req.params.user)) {
    return res.status(400).json({ error: "Unknown user" });
  }
  res.json(getExcludes(req.params.user));
});

app.post("/api/excludes/:user", (req, res) => {
  const { user } = req.params;
  if (!USERS.includes(user)) {
    return res.status(400).json({ error: "Unknown user" });
  }
  const { ratingKey, title, thumb } = req.body;
  if (!ratingKey) {
    return res.status(400).json({ error: "ratingKey required" });
  }
  res.json(addExclude(user, { ratingKey, title, thumb }));
});

app.delete("/api/excludes/:user/:ratingKey", (req, res) => {
  const { user, ratingKey } = req.params;
  if (!USERS.includes(user)) {
    return res.status(400).json({ error: "Unknown user" });
  }
  res.json(removeExclude(user, ratingKey));
});

const port = process.env.PORT || 4100;
app.listen(port, () => console.log(`PlexMatch server listening on :${port}`));
