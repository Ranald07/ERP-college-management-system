import { Bar } from "react-chartjs-2";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import useFetch from "../../hooks/useFetch";
import { getTeacherPerformance } from "../../services/statsService";

const barColor = (pct) => pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";

const TeacherPerformance = () => {
  const { data: teachers, loading, error } = useFetch(getTeacherPerformance);

  if (loading) return <CollegeLayout pageTitle="Teacher Performance"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Teacher Performance"><ErrorMessage message={error} /></CollegeLayout>;

  const rows = teachers || [];
  const totalTeachers = rows.length;
  const avgPassPct = rows.length ? (rows.reduce((s,r) => s + Number(r.avg_pass_pct||0), 0) / rows.length).toFixed(1) : 0;
  const above75 = rows.filter(r => Number(r.avg_pass_pct||0) >= 75).length;
  const below50  = rows.filter(r => Number(r.avg_pass_pct||0) < 50).length;

  const chartData = {
    labels: rows.map(t => t.name),
    datasets: [{
      label: "Avg Pass %",
      data: rows.map(t => Number(t.avg_pass_pct || 0)),
      backgroundColor: rows.map(t => barColor(Number(t.avg_pass_pct || 0))),
      borderRadius: 4,
    }],
  };

  return (
    <CollegeLayout pageTitle="Teacher Performance">
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        {[
          { label:"Total Teachers",       value: totalTeachers, accent:"#1e40af" },
          { label:"Avg Pass % (All)",     value: avgPassPct+"%", accent:"#059669" },
          { label:"Above 75% Pass",       value: above75,       accent:"#7c3aed" },
          { label:"Below 50% Pass",       value: below50,       accent:"#dc2626" },
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

      <div className="dash-chart-card" style={{ marginBottom: 24 }}>
        <div className="dash-chart-card__header">
          <span className="dash-chart-card__title">Avg Pass % by Teacher</span>
        </div>
        <div style={{ height: Math.max(200, rows.length * 36) }}>
          <Bar data={chartData} options={{
            indexAxis: "y",
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { min:0, max:100, grid:{ color:"#f1f5f9" } }, y:{ grid:{ display:false } } },
          }} />
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Employee ID</th><th>Dept</th>
            <th>Subjects Taught</th><th>Total Students</th><th>Avg Pass %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.teacher_id}>
              <td style={{ fontWeight:600 }}>{t.name}</td>
              <td>{t.employee_id}</td>
              <td><span className="dept-tag">{t.dept_code}</span></td>
              <td>{t.subjects_taught || 0}</td>
              <td>{t.total_students || 0}</td>
              <td>
                <span style={{ fontWeight:700, color: barColor(Number(t.avg_pass_pct||0)) }}>
                  {t.avg_pass_pct != null ? t.avg_pass_pct + "%" : "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CollegeLayout>
  );
};

export default TeacherPerformance;
