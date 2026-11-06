import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSections,
  getSectionItems,
  getRound,
  submitPicks,
  resetRound,
  posterUrl,
  getExcludes,
  addExclude,
  removeExclude,
} from "./api.js";
import PosterCard from "./PosterCard.jsx";

const USERS = { kevin: "Kevin", kelita: "Kelita" };

function NamePicker({ onPick }) {
  return (
    <div className="screen centered">
      <h1>PlexMatch</h1>
      <p className="subtitle">Who's picking?</p>
      <div className="name-buttons">
        {Object.entries(USERS).map(([key, label]) => (
          <button key={key} className="big-button" onClick={() => onPick(key)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function pickKey(pick) {
  return pick.type === "genre" ? `genre:${pick.genre}` : pick.ratingKey;
}

function GenreChip({ genre, selected, rank, onClick }) {
  return (
    <button className={`genre-chip ${selected ? "selected" : ""}`} onClick={onClick}>
      {genre}
      {selected && <span className="genre-chip-badge">{rank}</span>}
    </button>
  );
}

function LibraryBrowser({ me, onSubmit, error, submitting }) {
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [genreFilter, setGenreFilter] = useState("");
  const [hideWatched, setHideWatched] = useState(false);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [excludedItems, setExcludedItems] = useState([]);
  const [managingExcludes, setManagingExcludes] = useState(false);

  useEffect(() => {
    getSections().then((s) => {
      setSections(s);
      if (s.length) setActiveSection(s[0].key);
    });
    getExcludes(me).then(setExcludedItems);
  }, [me]);

  useEffect(() => {
    if (!activeSection) return;
    setLoading(true);
    setGenreFilter("");
    setSearch("");
    getSectionItems(activeSection).then((i) => {
      const sorted = [...i].sort((a, b) =>
        a.titleSort.localeCompare(b.titleSort, undefined, { sensitivity: "base" })
      );
      setItems(sorted);
      setLoading(false);
    });
  }, [activeSection]);

  const availableGenres = useMemo(
    () => [...new Set(items.flatMap((i) => i.genres || []))].sort(),
    [items]
  );

  const excludedKeys = useMemo(
    () => new Set(excludedItems.map((i) => i.ratingKey)),
    [excludedItems]
  );

  const displayedItems = items.filter((i) => {
    if (genreFilter && !(i.genres || []).includes(genreFilter)) return false;
    if (excludedKeys.has(i.ratingKey)) return false;
    if (hideWatched && i.viewCount) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggle(item) {
    setSelected((prev) => {
      const exists = prev.find((p) => p.ratingKey === item.ratingKey);
      if (exists) return prev.filter((p) => p.ratingKey !== item.ratingKey);
      if (prev.length >= 5) return prev;
      return [...prev, item];
    });
  }

  function toggleGenrePick(genre) {
    setSelected((prev) => {
      const exists = prev.find((p) => p.type === "genre" && p.genre === genre);
      if (exists) return prev.filter((p) => !(p.type === "genre" && p.genre === genre));
      if (prev.length >= 5) return prev;
      return [...prev, { type: "genre", genre }];
    });
  }

  function removePick(key) {
    setSelected((prev) => prev.filter((p) => pickKey(p) !== key));
  }

  async function handleExclude(item) {
    const updated = await addExclude(me, {
      ratingKey: item.ratingKey,
      title: item.title,
      thumb: item.thumb,
    });
    setExcludedItems(updated);
    setSelected((prev) => prev.filter((p) => p.ratingKey !== item.ratingKey));
  }

  async function handleUnexclude(ratingKey) {
    const updated = await removeExclude(me, ratingKey);
    setExcludedItems(updated);
  }

  return (
    <div className="screen">
      <div className="tabs">
        {sections.map((s) => (
          <button
            key={s.key}
            className={`tab ${s.key === activeSection ? "active" : ""}`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.title}
          </button>
        ))}
      </div>

      {!loading && (
        <input
          type="text"
          className="search-box"
          placeholder="Search titles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {!loading && availableGenres.length > 0 && (
        <>
          <select
            className="genre-filter"
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
          >
            <option value="">All genres</option>
            {availableGenres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <p className="wildcard-label">Not picky? Just pick a genre instead:</p>
          <div className="genre-chip-row">
            {availableGenres.map((g) => {
              const idx = selected.findIndex((p) => p.type === "genre" && p.genre === g);
              return (
                <GenreChip
                  key={g}
                  genre={g}
                  selected={idx !== -1}
                  rank={idx + 1}
                  onClick={() => toggleGenrePick(g)}
                />
              );
            })}
          </div>
        </>
      )}

      {!loading && (
        <div className="filter-row">
          <label className="watched-toggle">
            <input
              type="checkbox"
              checked={hideWatched}
              onChange={(e) => setHideWatched(e.target.checked)}
            />
            Hide watched
          </label>
          {excludedItems.length > 0 && (
            <button className="link-button" onClick={() => setManagingExcludes(true)}>
              🚫 {excludedItems.length} hidden · manage
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="centered-text">Loading library…</p>
      ) : (
        <div className="grid">
          {displayedItems.map((item) => {
            const idx = selected.findIndex((p) => p.ratingKey === item.ratingKey);
            return (
              <PosterCard
                key={item.ratingKey}
                item={item}
                selected={idx !== -1}
                rank={idx + 1}
                onClick={() => toggle(item)}
                onExclude={handleExclude}
              />
            );
          })}
        </div>
      )}

      <div className="bottom-bar">
        {error && <div className="error">{error}</div>}
        <span>{selected.length}/5 picked</span>
        <button
          className="link-button"
          disabled={selected.length === 0}
          onClick={() => setSelected([])}
        >
          clear all
        </button>
        <button
          className="primary-button"
          disabled={selected.length === 0 || submitting}
          onClick={() => setConfirming(true)}
        >
          {submitting ? "Submitting…" : "Submit picks"}
        </button>
      </div>

      {confirming && (
        <ConfirmModal
          picks={selected}
          onRemove={removePick}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            onSubmit(selected);
            setConfirming(false);
          }}
        />
      )}

      {managingExcludes && (
        <ManageExcludesModal
          items={excludedItems}
          onUnexclude={handleUnexclude}
          onClose={() => setManagingExcludes(false)}
        />
      )}
    </div>
  );
}

function ManageExcludesModal({ items, onUnexclude, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Hidden titles ({items.length})</h3>
        <p className="subtitle">These won't show up while browsing. Tap × to bring one back.</p>
        {items.length === 0 ? (
          <p className="centered-text">Nothing hidden.</p>
        ) : (
          <div className="modal-pick-list">
            {items.map((item) => (
              <div key={item.ratingKey} className="modal-pick">
                <img src={posterUrl(item.thumb)} alt={item.title} />
                <button
                  className="modal-pick-remove"
                  onClick={() => onUnexclude(item.ratingKey)}
                  aria-label="Unhide"
                >
                  ×
                </button>
                <div className="poster-title">{item.title}</div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-buttons">
          <button className="link-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ picks, onRemove, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          Lock in {picks.length} pick{picks.length === 1 ? "" : "s"}?
        </h3>
        <p className="subtitle">Tap the × to drop one before submitting.</p>
        <div className="modal-pick-list">
          {picks.map((pick) => (
            <div key={pickKey(pick)} className="modal-pick">
              <PickPreview pick={pick} />
              <button
                className="modal-pick-remove"
                onClick={() => onRemove(pickKey(pick))}
                aria-label="Remove pick"
              >
                ×
              </button>
              <div className="poster-title">{pick.type === "genre" ? pick.genre : pick.title}</div>
            </div>
          ))}
        </div>
        <div className="modal-buttons">
          <button className="link-button" onClick={onCancel}>
            Go back
          </button>
          <button className="primary-button" disabled={picks.length === 0} onClick={onConfirm}>
            Yes, submit
          </button>
        </div>
      </div>
    </div>
  );
}

function PickPreview({ pick }) {
  if (pick.type === "genre") {
    return <div className="genre-chip static">{pick.genre}</div>;
  }
  return <img src={posterUrl(pick.thumb)} alt={pick.title} />;
}

function WaitingScreen({ me, round }) {
  const otherUser = Object.keys(USERS).find((u) => u !== me);
  return (
    <div className="screen centered">
      <h2>Picks in!</h2>
      <p className="subtitle">Waiting for {USERS[otherUser]}…</p>
      <div className="pick-preview">
        {round.picks[me]?.map((pick) => (
          <PickPreview key={pickKey(pick)} pick={pick} />
        ))}
      </div>
    </div>
  );
}

function matchLabel(item) {
  if (item.matchType === "suggested") return `🎲 Suggested ${item.genre} pick`;
  if (item.matchType === "genre") return `🎭 Matched via ${item.genre}`;
  return null;
}

function MatchReveal({ round, onNewRound }) {
  const hasMatch = round.matches.length > 0;
  return (
    <div className="screen centered">
      <h1>{hasMatch ? "It's a match! 🎬" : "No match this time 😅"}</h1>
      {hasMatch ? (
        <div className="grid match-grid">
          {round.matches.map((item) => (
            <div key={item.ratingKey} className="poster-card static">
              <img src={posterUrl(item.thumb)} alt={item.title} />
              <div className="poster-title">{item.title}</div>
              {matchLabel(item) && <div className="match-label">{matchLabel(item)}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-match-columns">
          {Object.entries(USERS).map(([key, label]) => (
            <div key={key}>
              <h3>{label}</h3>
              {round.picks[key].map((pick) => (
                <div key={pickKey(pick)} className="poster-card static small">
                  <PickPreview pick={pick} />
                  {pick.type !== "genre" && <div className="poster-title">{pick.title}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button className="primary-button" onClick={onNewRound}>
        Start new round
      </button>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(() => localStorage.getItem("plexmatch-user"));
  const [round, setRound] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef(null);

  function pickUser(user) {
    localStorage.setItem("plexmatch-user", user);
    setMe(user);
  }

  function switchUser() {
    localStorage.removeItem("plexmatch-user");
    setMe(null);
  }

  async function refreshRound() {
    try {
      setRound(await getRound());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!me) return;
    refreshRound();
  }, [me]);

  useEffect(() => {
    if (!round || round.bothIn) {
      clearInterval(pollRef.current);
      return;
    }
    if (round.picks[me]) {
      pollRef.current = setInterval(refreshRound, 3000);
      return () => clearInterval(pollRef.current);
    }
  }, [round, me]);

  async function handleSubmit(selected) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = selected.map((s) =>
        s.type === "genre"
          ? { type: "genre", genre: s.genre }
          : { ratingKey: s.ratingKey, title: s.title, thumb: s.thumb, genres: s.genres }
      );
      const updated = await submitPicks(me, payload);
      setRound(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewRound() {
    const fresh = await resetRound();
    setRound(fresh);
  }

  if (!me) return <NamePicker onPick={pickUser} />;
  if (!round) return <div className="screen centered">Loading…</div>;

  return (
    <>
      <header className="app-header">
        <span>👤 {USERS[me]}</span>
        <button className="link-button" onClick={switchUser}>
          switch user
        </button>
      </header>
      {round.bothIn ? (
        <MatchReveal round={round} onNewRound={handleNewRound} />
      ) : round.picks[me] ? (
        <WaitingScreen me={me} round={round} />
      ) : (
        <LibraryBrowser me={me} onSubmit={handleSubmit} error={error} submitting={submitting} />
      )}
    </>
  );
}
