import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CollegeLayout from "../../components/CollegeLayout";
import { importStudentsCSV } from "../../services/importService";

const TEMPLATE_HEADERS = "name,email,reg_no,dept_code,year,gender,dob,accommodation_type,room_no,phone,password";
const SAMPLE_ROW = "John Doe,john@apr.edu,24CSE001,CSE,1,Male,2006-05-10,Day Scholar,,9876543210,student123";

const downloadTemplate = () => {
  const csv = [TEMPLATE_HEADERS, SAMPLE_ROW].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "apr_student_import_template.csv"; a.click();
  URL.revokeObjectURL(url);
};

const ImportStudents = () => {
  const navigate = useNavigate();
  const fileRef  = useRef(null);
  const [preview, setPreview]   = useState([]);
  const [file, setFile]         = useState(null);
  const [result, setResult]     = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").filter(Boolean);
      const headers = lines[0].split(",");
      const rows = lines.slice(1, 6).map(l => {
        const vals = l.split(",");
        return headers.reduce((obj, h, i) => { obj[h.trim()] = vals[i]?.trim() || ""; return obj; }, {});
      });
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await importStudentsCSV(file);
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.response?.data?.message || "Upload failed" });
    } finally { setUploading(false); }
  };

  return (
    <CollegeLayout pageTitle="Import Students (CSV)">
      {/* Step 1 */}
      <div className="erp-form" style={{ marginBottom:20 }}>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:10, color:"#1e293b" }}>
          Step 1 — Download Template
        </h3>
        <p style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>
          Download the CSV template, fill in student data, then upload below.
          Required columns: name, email, reg_no, dept_code, year, gender, dob, accommodation_type.
        </p>
        <button className="erp-btn erp-btn--outline" onClick={downloadTemplate}>
          ↓ Download CSV Template
        </button>
      </div>

      {/* Step 2 */}
      <div className="erp-form" style={{ marginBottom:20 }}>
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:10, color:"#1e293b" }}>
          Step 2 — Select CSV File
        </h3>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile}
          style={{ fontSize:13, marginBottom:12 }} />

        {preview.length > 0 && (
          <>
            <p style={{ fontSize:12, color:"#64748b", marginBottom:8 }}>
              Preview (first {preview.length} rows):
            </p>
            <div style={{ overflowX:"auto" }}>
              <table className="data-table" style={{ fontSize:12 }}>
                <thead>
                  <tr>{Object.keys(preview[0]).map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Step 3 */}
      <div className="erp-form">
        <h3 style={{ fontSize:14, fontWeight:700, marginBottom:10, color:"#1e293b" }}>
          Step 3 — Upload
        </h3>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <button className="erp-btn erp-btn--primary" onClick={handleUpload}
            disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload & Import"}
          </button>
          <button className="erp-btn erp-btn--outline" onClick={() => navigate("/admin/students")}>
            Back to Students
          </button>
        </div>

        {result && !result.error && (
          <div style={{ marginTop:16 }}>
            <div style={{ display:"flex", gap:16, marginBottom:12 }}>
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 18px" }}>
                <p style={{ fontSize:12, color:"#166534", margin:0 }}>Created</p>
                <p style={{ fontSize:22, fontWeight:800, color:"#16a34a", margin:0 }}>{result.success_rows}</p>
              </div>
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 18px" }}>
                <p style={{ fontSize:12, color:"#991b1b", margin:0 }}>Failed</p>
                <p style={{ fontSize:22, fontWeight:800, color:"#dc2626", margin:0 }}>{result.failed_rows}</p>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <table className="data-table" style={{ fontSize:12 }}>
                <thead><tr><th>Row</th><th>Reason</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}><td>{e.row}</td><td style={{ color:"#dc2626" }}>{e.reason}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {result?.error && (
          <p style={{ color:"#dc2626", marginTop:12, fontSize:13 }}>{result.error}</p>
        )}
      </div>
    </CollegeLayout>
  );
};

export default ImportStudents;
