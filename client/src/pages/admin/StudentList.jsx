import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import useFetch from "../../hooks/useFetch";
import { getStudents } from "../../services/studentService";

const StudentList = () => {
  const navigate = useNavigate();
  const { data: students, loading, error } = useFetch(getStudents);
  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const filtered = (students || []).filter(s => {
    const q = search.toLowerCase();
    return (
      (!search || s.name.toLowerCase().includes(q) || s.reg_no.toLowerCase().includes(q)) &&
      (!deptFilter || s.dept === deptFilter) &&
      (!yearFilter || String(s.year) === yearFilter)
    );
  });

  return (
    <CollegeLayout pageTitle="Student List">
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
        <>
          <div className="erp-toolbar">
            <input className="erp-search" placeholder="Search by name or reg no…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="erp-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {["CSE","ECE","MECH","CIVIL","IT","EEE"].map(d => <option key={d}>{d}</option>)}
            </select>
            <select className="erp-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="">All Years</option>
              {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
            <button className="erp-btn erp-btn--primary" onClick={() => navigate("/admin/students/add")}>
              + Add Student
            </button>
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
        </>
      )}
    </CollegeLayout>
  );
};

export default StudentList;
