const catIcon = { Technical:"💻", Sports:"🏅", Cultural:"🎭", Academic:"📚", Other:"🏆" };

const AchievementList = ({ achievements }) => {
  if (!achievements?.length)
    return <p className="empty-state">No achievements recorded yet.</p>;

  return (
    <ul className="achievement-list">
      {achievements.map(a => (
        <li key={a.id} className="achievement-item">
          <span className="achievement-icon">{catIcon[a.category] || "🏆"}</span>
          <div>
            <strong>{a.title}</strong>
            <span className="achievement-meta"> — {a.category} — {a.year}</span>
            {a.description && <p className="achievement-desc">{a.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default AchievementList;
