import { useNavigate } from "react-router-dom";
import { useState } from "react";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import useFetch from "../../hooks/useFetch";
import { getTeachers, deleteTeacher } from "../../services/teacherService";

const TeacherList = () => {
  const navigate = useNavigate();
  const { data: teachers, loading, error, refetch } = useFetch(getTeachers);
  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete teacher "${name}"? This cannot be undone.`)) return;
    try { await deleteTeacher(id); refetch(); }
    catch (err) { alert(err.response?.data?.message || "Failed to delete"); }
  };

  const filtered = (teachers || []).filter(t => {
    const q = search.toLowerCase();
    return (
      (!search || t.name.toLowerCase().includes(q) || t.employee_id.toLowerCase().includes(q)) &&
      (!deptFilter || t.dept === deptFilter)
    );
  });

  return (
    <CollegeLayout pageTitle="Teacher List">
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
        <>
          <div className="erp-toolbar">
            <input className="erp-search" placeholder="Search by name or employee ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="erp-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {["CSE","ECE","MECH","CIVIL","IT","EEE"].map(d => <option key={d}>{d}</option>)}
            </select>
            <button className="erp-btn erp-btn--primary" onClick={() => navigate("/admin/teachers/add")}>
              + Add Teacher
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Employee ID</th><th>Dept</th><th>Designation</th><th>Email</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={6} style={{ textAlign:"center", color:"#94a3b8", padding:20 }}>No teachers found.</td></tr>
                : filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight:600 }}>{t.name}</td>
                    <td>{t.employee_id}</td>
                    <td><span className="dept-tag">{t.dept}</span></td>
                    <td>{t.designation}</td>
                    <td>{t.email}</td>
                    <td className="actions">
                      <button className="erp-btn erp-btn--sm erp-btn--outline"
                        onClick={() => navigate(`/admin/teachers/${t.id}/edit`)}>Edit</button>
                      <button className="erp-btn erp-btn--sm erp-btn--danger"
                        onClick={() => handleDelete(t.id, t.name)}>Delete</button>
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

export default TeacherList;
