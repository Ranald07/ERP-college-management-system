import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import useFetch from "../../hooks/useFetch";
import { createTeacher } from "../../services/teacherService";
import { getDepartments } from "../../services/departmentService";

const DESIGNATIONS = ["Professor","Associate Professor","Assistant Professor","Lecturer"];

const AddTeacher = () => {
  const navigate = useNavigate();
  const { data: depts, loading: deptLoading } = useFetch(getDepartments);
  const [form, setForm] = useState({ name:"", email:"", password:"teacher123", employee_id:"", dept_id:"", designation:"Assistant Professor", phone:"" });
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving]           = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name)        e.name        = "Required";
    if (!form.email)       e.email       = "Required";
    if (!form.employee_id) e.employee_id = "Required";
    if (!form.dept_id)     e.dept_id     = "Required";
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await createTeacher(form);
      navigate("/admin/teachers");
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to create teacher");
    } finally { setSaving(false); }
  };

  if (deptLoading) return <CollegeLayout pageTitle="Add New Teacher"><LoadingSpinner /></CollegeLayout>;

  return (
    <CollegeLayout pageTitle="Add New Teacher">
      <form className="erp-form" onSubmit={handleSubmit} noValidate>
        <div className="erp-form-grid">
          <div className="erp-form-group">
            <label>Full Name *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Dr. Ramesh Kumar" />
            {errors.name && <span className="erp-form-error">{errors.name}</span>}
          </div>
          <div className="erp-form-group">
            <label>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="teacher@apr.edu" />
            {errors.email && <span className="erp-form-error">{errors.email}</span>}
          </div>
          <div className="erp-form-group">
            <label>Employee ID *</label>
            <input name="employee_id" value={form.employee_id} onChange={handleChange} placeholder="TCH009" />
            {errors.employee_id && <span className="erp-form-error">{errors.employee_id}</span>}
          </div>
          <div className="erp-form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="9876543210" />
          </div>
          <div className="erp-form-group">
            <label>Department *</label>
            <select name="dept_id" value={form.dept_id} onChange={handleChange}>
              <option value="">Select department</option>
              {(depts||[]).map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
            {errors.dept_id && <span className="erp-form-error">{errors.dept_id}</span>}
          </div>
          <div className="erp-form-group">
            <label>Designation</label>
            <select name="designation" value={form.designation} onChange={handleChange}>
              {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="erp-form-group">
            <label>Default Password</label>
            <input name="password" value={form.password} onChange={handleChange} />
          </div>
        </div>
        {serverError && <p className="erp-form-error" style={{ marginTop:12 }}>{serverError}</p>}
        <div className="erp-form-actions">
          <button type="button" className="erp-btn erp-btn--outline" onClick={() => navigate("/admin/teachers")}>Cancel</button>
          <button type="submit" className="erp-btn erp-btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Add Teacher"}
          </button>
        </div>
      </form>
    </CollegeLayout>
  );
};

export default AddTeacher;
