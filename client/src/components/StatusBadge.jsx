const configs = {
  // leave statuses
  Pending:  { cls: "badge--amber" },
  Approved: { cls: "badge--green" },
  Rejected: { cls: "badge--red"   },
  // query statuses
  Open:     { cls: "badge--green" },
  Replied:  { cls: "badge--blue"  },
  Closed:   { cls: "badge--red"   },
  // lock
  Locked:   { cls: "badge--gray"  },
};

const StatusBadge = ({ status }) => {
  const cfg = configs[status] || { cls: "badge--gray" };
  return <span className={`status-badge ${cfg.cls}`}>{status}</span>;
};

export default StatusBadge;
