
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Public Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// Student Layout
import StudentLayout from "./layouts/StudentLayout";

// Student Academic Pages
import StudentDashboard from "./pages/StudentDashboard";
import StudentCourses from "./pages/StudentCourses";
import StudentAttendance from "./pages/StudentAttendance";
import StudentAssignments from "./pages/StudentAssignments";
import StudentResults from "./pages/StudentResults";
import StudentRoutine from "./pages/StudentRoutine";
import StudentNotices from "./pages/StudentNotices";

// Student Services
import StudentLibrary from "./pages/StudentLibrary";
import StudentFees from "./pages/StudentFees";
import StudentMessages from "./pages/StudentMessages";
import StudentCareer from "./pages/StudentCareer";
import StudentEvents from "./pages/StudentEvents";
import StudentResearch from "./pages/StudentResearch";
import StudentSupport from "./pages/StudentSupport";

// Student Account
import StudentProfile from "./pages/StudentProfile";
import StudentSettings from "./pages/StudentSettings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Student Portal */}
        <Route path="/student" element={<StudentLayout />}>
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          {/* Academics */}
          <Route
            path="dashboard"
            element={<StudentDashboard />}
          />
          <Route
            path="courses"
            element={<StudentCourses />}
          />
          <Route
            path="attendance"
            element={<StudentAttendance />}
          />
          <Route
            path="assignments"
            element={<StudentAssignments />}
          />
          <Route
            path="results"
            element={<StudentResults />}
          />
          <Route
            path="routine"
            element={<StudentRoutine />}
          />
          <Route
            path="notices"
            element={<StudentNotices />}
          />

          {/* Campus Services */}
          <Route
            path="library"
            element={<StudentLibrary />}
          />
          <Route
            path="fees"
            element={<StudentFees />}
          />
          <Route
            path="messages"
            element={<StudentMessages />}
          />
          <Route
            path="career"
            element={<StudentCareer />}
          />
          <Route
            path="events"
            element={<StudentEvents />}
          />
          <Route
            path="research"
            element={<StudentResearch />}
          />
          <Route
            path="support"
            element={<StudentSupport />}
          />

          {/* Account */}
          <Route
            path="profile"
            element={<StudentProfile />}
          />
          <Route
            path="settings"
            element={<StudentSettings />}
          />
        </Route>

        {/* Unknown URLs */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
