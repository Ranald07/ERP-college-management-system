import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CollegeLayout from "../../components/CollegeLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import useFetch from "../../hooks/useFetch";
import { createStudent } from "../../services/studentService";
import { getDepartments } from "../../services/departmentService";

const AddStudent = () => {
  const navigate = useNavigate();
  const { data: depts, loading: deptLoading } = useFetch(getDepartments);
  const [form, setForm] = useState({
    reg_no:"", name:"", email:"", password:"student123",
    dept_id:"", year:"", gender:"", dob:"",
    accommodation_type:"Day Scholar", room_no:"", phone:"", photo_url:"",
  });
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
    if (!form.reg_no)             e.reg_no             = "Required";
    if (!form.name)               e.name               = "Required";
    if (!form.email)              e.email              = "Required";
    if (!form.dept_id)            e.dept_id            = "Required";
    if (!form.year)               e.year               = "Required";
    if (!form.gender)             e.gender             = "Required";
    if (!form.dob)                e.dob                = "Required";
    if (form.accommodation_type === "Hosteller" && !form.room_no) e.room_no = "Required for hostellers";
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await createStudent(form);
      navigate("/admin/students");
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to create student");
    } finally { setSaving(false); }
  };

  if (deptLoading) return <CollegeLayout pageTitle="Add New Student"><LoadingSpinner /></CollegeLayout>;

  return (
    <CollegeLayout pageTitle="Add New Student">
      <form className="erp-form" onSubmit={handleSubmit} noValidate>
        <div className="erp-form-grid">
          {[
            { label:"Registration No *", name:"reg_no",   placeholder:"22CSE101" },
            { label:"Full Name *",       name:"name",     placeholder:"Arun Kumar" },
            { label:"Email *",           name:"email",    placeholder:"arun@apr.edu", type:"email" },
            { label:"Default Password",  name:"password", placeholder:"student123" },
            { label:"Phone",             name:"phone",    placeholder:"9876543210" },
            { label:"Photo URL",         name:"photo_url",placeholder:"https://..." },
          ].map(f => (
            <div className="erp-form-group" key={f.name}>
              <label>{f.label}</label>
              <input type={f.type||"text"} name={f.name} value={form[f.name]}
                onChange={handleChange} placeholder={f.placeholder||""} />
              {errors[f.name] && <span className="erp-form-error">{errors[f.name]}</span>}
            </div>
          ))}

          <div className="erp-form-group">
            <label>Department *</label>
            <select name="dept_id" value={form.dept_id} onChange={handleChange}>
              <option value="">Select department</option>
              {(depts||[]).map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
            {errors.dept_id && <span className="erp-form-error">{errors.dept_id}</span>}
          </div>

          <div className="erp-form-group">
            <label>Year *</label>
            <select name="year" value={form.year} onChange={handleChange}>
              <option value="">Select year</option>
              {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
            {errors.year && <span className="erp-form-error">{errors.year}</span>}
          </div>

          <div className="erp-form-group">
            <label>Gender *</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="">Select</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            {errors.gender && <span className="erp-form-error">{errors.gender}</span>}
          </div>

          <div className="erp-form-group">
            <label>Date of Birth *</label>
            <input type="date" name="dob" value={form.dob} onChange={handleChange} />
            {errors.dob && <span className="erp-form-error">{errors.dob}</span>}
          </div>

          <div className="erp-form-group" style={{ gridColumn:"1/-1" }}>
            <label>Accommodation *</label>
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
              <input name="room_no" value={form.room_no} onChange={handleChange} placeholder="H-204" />
              {errors.room_no && <span className="erp-form-error">{errors.room_no}</span>}
            </div>
          )}
        </div>

        {serverError && <p className="erp-form-error" style={{ marginTop:12 }}>{serverError}</p>}
        <div className="erp-form-actions">
          <button type="button" className="erp-btn erp-btn--outline" onClick={() => navigate("/admin/students")}>Cancel</button>
          <button type="submit" className="erp-btn erp-btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Add Student"}
          </button>
        </div>
      </form>
    </CollegeLayout>
  );
};

export default AddStudent;
