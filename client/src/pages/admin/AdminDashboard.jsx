import { useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import useFetch from "../../hooks/useFetch";
import { getAdminStats } from "../../services/statsService";
import { getStudents } from "../../services/studentService";

const KpiCard = ({ label, value, sub, accent }) => (
  <div className="kpi-card">
    <div className="kpi-card__accent" style={{ background: accent }} />
    <div className="kpi-card__body">
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value" style={{ color: accent }}>{value}</p>
      {sub && <p className="kpi-card__sub">{sub}</p>}
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats,    loading: l1, error: e1 } = useFetch(getAdminStats);
  const { data: students, loading: l2, error: e2 } = useFetch(getStudents);

  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  if (l1 || l2) return <CollegeLayout pageTitle="Institution Dashboard"><LoadingSpinner /></CollegeLayout>;
  if (e1 || e2) return <CollegeLayout pageTitle="Institution Dashboard"><ErrorMessage message={e1 || e2} /></CollegeLayout>;

  const filtered = (students || []).filter(s => {
    const q = search.toLowerCase();
    return (
      (!search || s.name.toLowerCase().includes(q) || s.reg_no.toLowerCase().includes(q)) &&
      (!deptFilter || s.dept === deptFilter) &&
      (!yearFilter || String(s.year) === yearFilter)
    );
  });

  const deptLabels = Object.keys(stats.deptCount || {});
  const deptValues = Object.values(stats.deptCount || {});
  const palette    = ["#1e40af","#0369a1","#0f766e","#15803d","#7e22ce","#b45309"];

  const deptChartData = {
    labels: deptLabels,
    datasets: [{ label:"Students", data: deptValues,
      backgroundColor: palette.slice(0, deptLabels.length), borderRadius: 4 }],
  };

  const doughnutData = {
    labels: ["Hostellers","Day Scholars"],
    datasets: [{ data:[stats.hostellerCount, stats.dayScholarCount],
      backgroundColor:["#1e40af","#e2e8f0"], borderColor:["#1e40af","#cbd5e1"], borderWidth:1 }],
  };

  const hostellerPct = stats.totalStudents
    ? ((stats.hostellerCount / stats.totalStudents) * 100).toFixed(1) : 0;

  return (
    <CollegeLayout pageTitle="Institution Dashboard">
      <div className="kpi-row">
        <KpiCard label="Total Enrolled"  value={stats.totalStudents}   sub="Active students"              accent="#1e40af" />
        <KpiCard label="Total Teachers"  value={stats.totalTeachers}   sub="Faculty members"              accent="#0369a1" />
        <KpiCard label="Institution Avg" value={stats.overallAvg}      sub="Across all marks"             accent="#0f766e" />
        <KpiCard label="Hostellers"      value={stats.hostellerCount}  sub={`${hostellerPct}% of total`}  accent="#7e22ce" />
      </div>

      <div className="dash-charts-row">
        <div className="dash-chart-card">
          <div className="dash-chart-card__header">
            <span className="dash-chart-card__title">Department-wise Enrolment</span>
            <span className="dash-chart-card__badge">{stats.totalStudents} total</span>
          </div>
          <Bar data={deptChartData} options={{ responsive:true, plugins:{ legend:{ display:false } },
            scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, grid:{ color:"#f1f5f9" } } } }} />
          <table className="dept-legend-table">
            <thead><tr><th>Department</th><th>Count</th><th>Share</th></tr></thead>
            <tbody>
              {deptLabels.map((d, i) => (
                <tr key={d}>
                  <td><span className="dept-dot" style={{ background: palette[i] }} />{d}</td>
                  <td>{deptValues[i]}</td>
                  <td>{stats.totalStudents ? ((deptValues[i]/stats.totalStudents)*100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dash-right-col">
          <div className="dash-chart-card">
            <div className="dash-chart-card__header">
              <span className="dash-chart-card__title">Accommodation Split</span>
            </div>
            <div style={{ maxWidth:200, margin:"0 auto" }}>
              <Doughnut data={doughnutData} options={{ responsive:true, cutout:"68%",
                plugins:{ legend:{ position:"bottom" } } }} />
            </div>
            <div className="accom-stats">
              {[["#1e40af","Hostellers",stats.hostellerCount],["#94a3b8","Day Scholars",stats.dayScholarCount]].map(([c,l,v]) => (
                <div key={l} className="accom-stat">
                  <span className="accom-stat__dot" style={{ background:c }} />
                  <span className="accom-stat__label">{l}</span>
                  <span className="accom-stat__val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-chart-card" style={{ marginTop:16 }}>
            <div className="dash-chart-card__header">
              <span className="dash-chart-card__title">Top Performers</span>
              <span className="dash-chart-card__badge">by avg marks</span>
            </div>
            <table className="top-students-table">
              <thead><tr><th>#</th><th>Name</th><th>Dept</th><th>Avg</th></tr></thead>
              <tbody>
                {(stats.topStudents || []).map((s, i) => (
                  <tr key={s.id} style={{ cursor:"pointer" }}
                    onClick={() => navigate(`/admin/students/${s.id}`)}>
                    <td className="rank-cell">{i+1}</td>
                    <td>{s.name}</td>
                    <td><span className="dept-tag">{s.dept}</span></td>
                    <td className="cgpa-cell">{s.avg_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section__header">
          <span className="dash-section__title">Student Directory</span>
          <span className="dash-section__count">{filtered.length} records</span>
        </div>
        <div className="erp-toolbar">
          <input className="erp-search" placeholder="Search by name or reg no"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="erp-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {["CSE","ECE","MECH","CIVIL","IT","EEE"].map(d => <option key={d}>{d}</option>)}
          </select>
          <select className="erp-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">All Years</option>
            {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Reg No</th><th>Dept</th><th>Year</th><th>Accommodation</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} style={{ textAlign:"center", color:"#94a3b8", padding:20 }}>No students found.</td></tr>
              : filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight:600 }}>{s.name}</td>
                  <td>{s.reg_no}</td>
                  <td><span className="dept-tag">{s.dept}</span></td>
                  <td>Year {s.year}</td>
                  <td>{s.accommodation_type}</td>
                  <td className="actions">
                    <button className="erp-btn erp-btn--sm erp-btn--primary"
                      onClick={() => navigate(`/admin/students/${s.id}`)}>View</button>
                    <button className="erp-btn erp-btn--sm erp-btn--outline"
                      onClick={() => navigate(`/admin/students/${s.id}/edit`)}>Edit</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </CollegeLayout>
  );
};

export default AdminDashboard;
