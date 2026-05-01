import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement,
} from "chart.js";

import { AuthProvider }  from "./context/AuthContext";
import AdminRoute        from "./routes/AdminRoute";
import StudentRoute      from "./routes/StudentRoute";
import TeacherRoute      from "./routes/TeacherRoute";

import Login             from "./pages/Login";

// Admin
import AdminDashboard    from "./pages/admin/AdminDashboard";
import StudentList       from "./pages/admin/StudentList";
import AddStudent        from "./pages/admin/AddStudent";
import EditStudent       from "./pages/admin/EditStudent";
import StudentProfile    from "./pages/admin/StudentProfile";
import TeacherList       from "./pages/admin/TeacherList";
import AddTeacher        from "./pages/admin/AddTeacher";
import EditTeacher       from "./pages/admin/EditTeacher";
import SubjectAnalysis   from "./pages/admin/SubjectAnalysis";
import TeacherPerformance from "./pages/admin/TeacherPerformance";
import Announcements     from "./pages/admin/Announcements";
import ImportStudents    from "./pages/admin/ImportStudents";

// Teacher
import TeacherDashboard  from "./pages/teacher/TeacherDashboard";
import AdviseeLeaves     from "./pages/teacher/AdviseeLeaves";
import QueryInbox        from "./pages/teacher/QueryInbox";

// Student
import MyProfile         from "./pages/student/MyProfile";
import StudentDashboard  from "./pages/student/StudentDashboard";
import StudentAchievements from "./pages/student/StudentAchievements";
import LeaveApplication  from "./pages/student/LeaveApplication";
import QueryCenter       from "./pages/student/QueryCenter";

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"      element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin/dashboard"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/students"           element={<AdminRoute><StudentList /></AdminRoute>} />
          <Route path="/admin/students/add"       element={<AdminRoute><AddStudent /></AdminRoute>} />
          <Route path="/admin/students/import"    element={<AdminRoute><ImportStudents /></AdminRoute>} />
          <Route path="/admin/students/:id"       element={<AdminRoute><StudentProfile /></AdminRoute>} />
          <Route path="/admin/students/:id/edit"  element={<AdminRoute><EditStudent /></AdminRoute>} />
          <Route path="/admin/teachers"           element={<AdminRoute><TeacherList /></AdminRoute>} />
          <Route path="/admin/teachers/add"       element={<AdminRoute><AddTeacher /></AdminRoute>} />
          <Route path="/admin/teachers/:id/edit"  element={<AdminRoute><EditTeacher /></AdminRoute>} />
          <Route path="/admin/subject-analysis"   element={<AdminRoute><SubjectAnalysis /></AdminRoute>} />
          <Route path="/admin/teacher-performance"element={<AdminRoute><TeacherPerformance /></AdminRoute>} />
          <Route path="/admin/announcements"      element={<AdminRoute><Announcements /></AdminRoute>} />

          {/* Teacher */}
          <Route path="/teacher/dashboard"        element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
          <Route path="/teacher/advisees/leaves"  element={<TeacherRoute><AdviseeLeaves /></TeacherRoute>} />
          <Route path="/teacher/queries"          element={<TeacherRoute><QueryInbox /></TeacherRoute>} />

          {/* Student */}
          <Route path="/student/profile"          element={<StudentRoute><MyProfile /></StudentRoute>} />
          <Route path="/student/dashboard"        element={<StudentRoute><StudentDashboard /></StudentRoute>} />
          <Route path="/student/achievements"     element={<StudentRoute><StudentAchievements /></StudentRoute>} />
          <Route path="/student/leave"            element={<StudentRoute><LeaveApplication /></StudentRoute>} />
          <Route path="/student/queries"          element={<StudentRoute><QueryCenter /></StudentRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
