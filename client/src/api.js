async function req(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${path}`);
  }
  return res.json();
}

export const getSections = () => req("/sections");
export const getSectionItems = (key) => req(`/sections/${key}/items`);
export const getRound = () => req("/round");
export const submitPicks = (user, items) =>
  req("/round/pick", { method: "POST", body: JSON.stringify({ user, items }) });
export const resetRound = () => req("/round/reset", { method: "POST" });

export const getExcludes = (user) => req(`/excludes/${user}`);
export const addExclude = (user, item) =>
  req(`/excludes/${user}`, { method: "POST", body: JSON.stringify(item) });
export const removeExclude = (user, ratingKey) =>
  req(`/excludes/${user}/${ratingKey}`, { method: "DELETE" });

export function posterUrl(thumb) {
  if (!thumb) return null;
  return `/api/image?path=${encodeURIComponent(thumb)}`;
}
