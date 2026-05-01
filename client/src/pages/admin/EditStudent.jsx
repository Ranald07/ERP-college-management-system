import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import { getStudentById, updateStudent } from "../../services/studentService";
import { getDepartments } from "../../services/departmentService";

const EditStudent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm]               = useState(null);
  const [depts, setDepts]             = useState([]);
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    Promise.all([getStudentById(id), getDepartments()])
      .then(([sRes, dRes]) => {
        const s = sRes.data;
        setForm({
          name: s.name, email: s.email, dept_id: s.dept_id,
          year: s.year, gender: s.gender, dob: s.dob,
          accommodation_type: s.accommodation_type,
          room_no: s.room_no || "", phone: s.phone || "", photo_url: s.photo_url || "",
        });
        setDepts(dRes.data || []);
      })
      .catch(() => setServerError("Failed to load student"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: "" }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setServerError("");
    if (!form.name || !form.email) { setErrors({ name:!form.name?"Required":"", email:!form.email?"Required":"" }); return; }
    setSaving(true);
    try {
      await updateStudent(id, form);
      navigate(`/admin/students/${id}`);
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  };

  if (loading) return <CollegeLayout pageTitle="Edit Student"><LoadingSpinner /></CollegeLayout>;
  if (!form)   return <CollegeLayout pageTitle="Edit Student"><ErrorMessage message={serverError} /></CollegeLayout>;

  return (
    <CollegeLayout pageTitle="Edit Student">
      <form className="erp-form" onSubmit={handleSubmit} noValidate>
        <div className="erp-form-grid">
          <div className="erp-form-group">
            <label>Full Name *</label>
            <input name="name" value={form.name} onChange={handleChange} />
            {errors.name && <span className="erp-form-error">{errors.name}</span>}
          </div>
          <div className="erp-form-group">
            <label>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} />
            {errors.email && <span className="erp-form-error">{errors.email}</span>}
          </div>
          <div className="erp-form-group">
            <label>Department</label>
            <select name="dept_id" value={form.dept_id} onChange={handleChange}>
              {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
          <div className="erp-form-group">
            <label>Year</label>
            <select name="year" value={form.year} onChange={handleChange}>
              {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="erp-form-group">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div className="erp-form-group">
            <label>Date of Birth</label>
            <input type="date" name="dob" value={form.dob} onChange={handleChange} />
          </div>
          <div className="erp-form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="erp-form-group">
            <label>Photo URL</label>
            <input name="photo_url" value={form.photo_url} onChange={handleChange} />
          </div>
          <div className="erp-form-group" style={{ gridColumn:"1/-1" }}>
            <label>Accommodation</label>
            <div className="erp-radio-group">
              {["Day Scholar","Hosteller"].map(opt => (
                <label key={opt} className="erp-radio-label">
                  <input type="radio" name="accommodation_type" value={opt}
                    checked={form.accommodation_type===opt} onChange={handleChange} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          {form.accommodation_type === "Hosteller" && (
            <div className="erp-form-group">
              <label>Room No *</label>
              <input name="room_no" value={form.room_no} onChange={handleChange} />
            </div>
          )}
        </div>
        {serverError && <p className="erp-form-error" style={{ marginTop:12 }}>{serverError}</p>}
        <div className="erp-form-actions">
          <button type="button" className="erp-btn erp-btn--outline" onClick={() => navigate(`/admin/students/${id}`)}>Cancel</button>
          <button type="submit" className="erp-btn erp-btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </CollegeLayout>
  );
};

export default EditStudent;
