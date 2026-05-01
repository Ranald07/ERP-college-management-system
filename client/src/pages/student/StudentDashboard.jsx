import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { useAuth } from "../../context/AuthContext";
import { getStudentStats } from "../../services/statsService";
import { getMarksByStudent } from "../../services/marksService";
import { fmt2 } from "../../utils/formatters";

const StudentDashboard = () => {
  const { auth } = useAuth();
  const [stats, setStats]         = useState(null);
  const [marksDocs, setMarksDocs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selectedSem, setSelectedSem]     = useState(0);
  const [activeInternal, setActiveInternal] = useState(0);

  useEffect(() => {
    if (!auth?.roleId) return;
    Promise.all([getStudentStats(auth.roleId), getMarksByStudent(auth.roleId)])
      .then(([sRes, mRes]) => {
        setStats(sRes.data);
        setMarksDocs(mRes.data || []);
      })
      .catch(err => setError(err.response?.data?.message || "Failed to load marks"))
      .finally(() => setLoading(false));
  }, [auth]);

  if (loading) return <CollegeLayout pageTitle="Internal Test Mark"><LoadingSpinner /></CollegeLayout>;
  if (error)   return <CollegeLayout pageTitle="Internal Test Mark"><ErrorMessage message={error} /></CollegeLayout>;

  if (!marksDocs.length) return (
    <CollegeLayout pageTitle="Internal Test Mark">
      <p className="empty-state">No marks recorded yet. Check back after your results are published.</p>
    </CollegeLayout>
  );

  const getInternalPct = (semDoc, key) => {
    if (!semDoc.subjects.length) return 0;
    // each internal is out of 50, show as percentage
    const sum = semDoc.subjects.reduce((s, r) => s + Number(r[key] || 0), 0);
    return parseFloat(((sum / (semDoc.subjects.length * 50)) * 100).toFixed(2));
  };

  const chartData = {
    labels: marksDocs.map(m => `Sem ${m.semester}`),
    datasets: [
      { label:"Int 1", data: marksDocs.map(m => getInternalPct(m,"internal1")), backgroundColor:"#4472C4" },
      { label:"Int 2", data: marksDocs.map(m => getInternalPct(m,"internal2")), backgroundColor:"#ED7D31" },
      { label:"Int 3", data: marksDocs.map(m => getInternalPct(m,"internal3")), backgroundColor:"#A9D18E" },
    ],
  };

  const summaryRows = marksDocs.map(m => ({
    semester: m.semester,
    int1: getInternalPct(m,"internal1"),
    int2: getInternalPct(m,"internal2"),
    int3: getInternalPct(m,"internal3"),
  }));

  const currentSemDoc = marksDocs[selectedSem];
  const internalKeys  = ["internal1","internal2","internal3"];
  const currentKey    = internalKeys[activeInternal];
  const subjectRows   = currentSemDoc?.subjects || [];
  const totalMark     = subjectRows.reduce((s, r) => s + Number(r[currentKey] || 0), 0);
  const maxMark       = subjectRows.length * 50;

  return (
    <CollegeLayout pageTitle="Internal Test Mark">
      <div style={{ maxWidth:640, margin:"0 auto 28px" }}>
        <Bar data={chartData} options={{
          responsive:true,
          plugins:{ legend:{ position:"right" }, title:{ display:true, text:"Percentage Chart", font:{ size:13, weight:"bold" } } },
          scales:{ x:{ title:{ display:true, text:"Semester" }, grid:{ display:false } }, y:{ min:0, max:100, title:{ display:true, text:"Percentage" } } },
        }} />
      </div>

      <div className="erp-marks-wrapper">
        <table className="erp-marks-table">
          <thead>
            <tr>
              <th rowSpan={2} className="erp-marks-th-sem">Semester</th>
              <th colSpan={2}>Internal Test 1</th>
              <th colSpan={2}>Internal Test 2</th>
              <th colSpan={2}>Internal Test 3</th>
            </tr>
            <tr>
              <th>Per%</th><th>Rank</th>
              <th>Per%</th><th>Rank</th>
              <th>Per%</th><th>Rank</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((r, i) => (
              <tr key={i}>
                <td className="erp-marks-sem">{r.semester}</td>
                <td>{fmt2(r.int1)}</td><td>—</td>
                <td>{fmt2(r.int2)}</td><td>—</td>
                <td>{fmt2(r.int3)}</td><td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:16, margin:"20px 0 10px", flexWrap:"wrap" }}>
        <label style={{ fontWeight:600, fontSize:13 }}>Select Semester :</label>
        <select className="erp-select" value={selectedSem} onChange={e => setSelectedSem(Number(e.target.value))}>
          {marksDocs.map((m, i) => <option key={i} value={i}>Sem {m.semester}</option>)}
        </select>
      </div>

      {currentSemDoc && (
        <div className="erp-subject-detail">
          <div className="erp-subject-tabs">
            {["Internal Test 1","Internal Test 2","Internal Test 3"].map((label, i) => (
              <span key={i} className={`erp-subject-tab ${activeInternal===i?"erp-subject-tab--active":""}`}
                onClick={() => setActiveInternal(i)} style={{ cursor:"pointer" }}>
                {label}
              </span>
            ))}
          </div>
          <table className="erp-subject-table">
            <thead>
              <tr><th>Course Code</th><th>Course Name</th><th>Credit</th><th>Mark (/50)</th><th>Max</th><th>Status</th></tr>
            </thead>
            <tbody>
              {subjectRows.map((s, i) => {
                const mark = Number(s[currentKey] || 0);
                const pass = mark >= 20; // 40% of 50
                return (
                  <tr key={i}>
                    <td>{s.subject_code}</td>
                    <td style={{ textAlign:"left" }}>{s.subject_name}</td>
                    <td>{s.credits}</td>
                    <td style={{ fontWeight:600 }}>{mark}</td>
                    <td>50</td>
                    <td style={{ color: pass ? "#16a34a" : "#dc2626", fontWeight:600 }}>
                      {pass ? "Pass" : "Fail"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="erp-subject-total">
                <td colSpan={3} style={{ textAlign:"left", fontWeight:700 }}>Total</td>
                <td style={{ fontWeight:700 }}>{totalMark}</td>
                <td style={{ fontWeight:700 }}>{maxMark}</td>
                <td style={{ fontWeight:700 }}>{maxMark ? fmt2((totalMark/maxMark)*100) : 0}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </CollegeLayout>
  );
};

export default StudentDashboard;
