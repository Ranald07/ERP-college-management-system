import { useState } from "react";
import { Bar } from "react-chartjs-2";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import ExportButton from "../../components/ExportButton";
import useFetch from "../../hooks/useFetch";
import { getSubjectAnalysis } from "../../services/statsService";
import { exportMarks, exportSubjectAnalysis } from "../../services/exportService";

// Color thresholds based on avg marks out of 100
const barColor = (avg) => avg >= 75 ? "#16a34a" : avg >= 50 ? "#d97706" : "#dc2626";

const SubjectAnalysis = () => {
  const { data: subjects, loading, error } = useFetch(getSubjectAnalysis);
  const [deptFilter, setDeptFilter] = useState("");
  const [sortKey, setSortKey]       = useState("code");
  const [sortDir, setSortDir]       = useState("asc");

  if (loading) return <CollegeLayout pageTitle="Subject Analysis"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Subject Analysis"><ErrorMessage message={error} /></CollegeLayout>;

  const rows   = (subjects || []).filter(s => !deptFilter || s.dept_code === deptFilter);
  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
    return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const depts = [...new Set((subjects || []).map(s => s.dept_code))];

  // KPI cards based on avg_total
  const totalSubjects  = rows.length;
  const overallAvg     = rows.length
    ? (rows.reduce((s, r) => s + Number(r.avg_total || 0), 0) / rows.length).toFixed(1)
    : 0;
  const belowAvg50     = rows.filter(r => Number(r.avg_total || 0) < 50).length;
  const top            = rows.reduce((best, r) =>
    (!best || Number(r.avg_total || 0) > Number(best.avg_total || 0)) ? r : best, null);

  const chartData = {
    labels: sorted.map(s => s.code),
    datasets: [{
      label: "Avg Marks (/100)",
      data: sorted.map(s => Number(s.avg_total || 0)),
      backgroundColor: sorted.map(s => barColor(Number(s.avg_total || 0))),
      borderRadius: 4,
    }],
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const arrow = (key) => sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <CollegeLayout pageTitle="Subject Analysis">

      {/* KPI Cards */}
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        {[
          { label: "Total Subjects",        value: totalSubjects,      accent: "#1e40af" },
          { label: "Overall Avg Marks",     value: overallAvg + "/100",accent: "#059669" },
          { label: "Subjects Below 50 Avg", value: belowAvg50,         accent: "#dc2626" },
          { label: "Top Performing",        value: top?.code || "—",   accent: "#7c3aed" },
        ].map(c => (
          <div key={c.label} className="kpi-card">
            <div className="kpi-card__accent" style={{ background: c.accent }} />
            <div className="kpi-card__body">
              <p className="kpi-card__label">{c.label}</p>
              <p className="kpi-card__value" style={{ color: c.accent }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Export */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <select className="erp-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        <ExportButton label="Export Analysis" onExport={exportSubjectAnalysis} />
      </div>

      {/* Bar Chart — Avg Marks per Subject */}
      <div className="dash-chart-card" style={{ marginBottom: 24 }}>
        <div className="dash-chart-card__header">
          <span className="dash-chart-card__title">Average Marks by Subject (/100)</span>
          <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#16a34a" }}>■ ≥75</span>
            <span style={{ color: "#d97706" }}>■ 50–74</span>
            <span style={{ color: "#dc2626" }}>■ &lt;50</span>
          </div>
        </div>
        <div style={{ height: 260 }}>
          <Bar data={chartData} options={{
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false },
              tooltip: { callbacks: { label: ctx => ` Avg: ${ctx.parsed.y}/100` } } },
            scales: {
              y: { min: 0, max: 100, grid: { color: "#f1f5f9" },
                title: { display: true, text: "Avg Marks (/100)", font: { size: 11 } } },
              x: { grid: { display: false } },
            },
          }} />
        </div>
      </div>

      {/* Sortable Table */}
      <table className="data-table">
        <thead>
          <tr>
            {[
              ["code",      "Code"],
              ["name",      "Subject Name"],
              ["dept_code", "Dept"],
              ["semester",  "Sem"],
              ["enrolled",  "Enrolled"],
              ["avg_total", "Avg Marks"],
              ["pass_pct",  "Pass %"],
            ].map(([k, l]) => (
              <th key={k} onClick={() => handleSort(k)}
                style={{ cursor: "pointer", userSelect: "none" }}>
                {l}{arrow(k)}
              </th>
            ))}
            <th>Export</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0
            ? <tr><td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>No subjects found.</td></tr>
            : sorted.map(s => (
              <tr key={s.subject_id}>
                <td style={{ fontWeight: 600 }}>{s.code}</td>
                <td>{s.name}</td>
                <td><span className="dept-tag">{s.dept_code}</span></td>
                <td>{s.semester}</td>
                <td>{s.enrolled || 0}</td>
                <td>
                  <span style={{ fontWeight: 700, color: barColor(Number(s.avg_total || 0)) }}>
                    {s.avg_total != null ? `${s.avg_total}/100` : "—"}
                  </span>
                </td>
                <td style={{ color: "#64748b" }}>
                  {s.pass_pct != null ? s.pass_pct + "%" : "—"}
                </td>
                <td>
                  <ExportButton label="Marks" onExport={() => exportMarks(s.subject_id, s.code)} />
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </CollegeLayout>
  );
};

export default SubjectAnalysis;
