import { useNavigate } from "react-router-dom";

const StudentTable = ({ students }) => {
  const navigate = useNavigate();
  if (!students.length) return <p className="empty-state">No students found.</p>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Reg No</th>
          <th>Dept</th>
          <th>Year</th>
          <th>Accommodation</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {students.map(s => (
          <tr key={s.id}>
            <td style={{ fontWeight: 600 }}>{s.name}</td>
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
        ))}
      </tbody>
    </table>
  );
};

export default StudentTable;
