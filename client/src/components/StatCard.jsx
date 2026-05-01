const StatCard = ({ title, value, icon, color }) => (
  <div className={`stat-card stat-card--${color}`}>
    <div className="stat-card__icon-wrap">{icon}</div>
    <div>
      <p className="stat-card__title">{title}</p>
      <p className="stat-card__value">{value}</p>
    </div>
  </div>
);

export default StatCard;
