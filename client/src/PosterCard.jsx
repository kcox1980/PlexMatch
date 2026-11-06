import { posterUrl } from "./api.js";

export default function PosterCard({ item, selected, onClick, rank, onExclude }) {
  return (
    <div
      className={`poster-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      title={item.title}
    >
      {posterUrl(item.thumb) ? (
        <img src={posterUrl(item.thumb)} alt={item.title} loading="lazy" />
      ) : (
        <div className="poster-fallback">{item.title}</div>
      )}
      {selected && <div className="poster-badge">{rank}</div>}
      <button
        className="poster-exclude"
        onClick={(e) => {
          e.stopPropagation();
          onExclude(item);
        }}
        title="Never show me this"
        aria-label="Never show me this"
      >
        🚫
      </button>
      <div className="poster-title">
        {item.title} {item.year ? `(${item.year})` : ""}
      </div>
    </div>
  );
}
