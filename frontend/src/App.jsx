
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ========================================
// PUBLIC PAGES
// ========================================

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// ========================================
// STUDENT PORTAL
// ========================================

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

// ========================================
// FACULTY PORTAL
// ========================================

// Faculty Layout
import FacultyLayout from "./layouts/FacultyLayout";

// Faculty Pages
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyCourses from "./pages/faculty/FacultyCourses";
import FacultyAttendance from "./pages/faculty/FacultyAttendance";
import FacultyAssignments from "./pages/faculty/FacultyAssignments";
import FacultyGrading from "./pages/faculty/FacultyGrading";
import FacultySchedule from "./pages/faculty/FacultySchedule";
import FacultyNotices from "./pages/faculty/FacultyNotices";
import FacultyMessages from "./pages/faculty/FacultyMessages";
import FacultyProfile from "./pages/faculty/FacultyProfile";
import FacultySettings from "./pages/faculty/FacultySettings";

// ========================================
// ADMIN PORTAL
// ========================================

// Admin Layout
import AdminLayout from "./layouts/AdminLayout";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminFaculty from "./pages/admin/AdminFaculty";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDepartments from "./pages/admin/AdminDepartments";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminEnrollment from "./pages/admin/AdminEnrollment";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminExaminations from "./pages/admin/AdminExaminations";
import AdminResults from "./pages/admin/AdminResults";
import AdminTimetable from "./pages/admin/AdminTimetable";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminLibrary from "./pages/admin/AdminLibrary";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

// ========================================
// LIBRARIAN PORTAL
// ========================================

// Librarian Layout
import LibrarianLayout from "./layouts/LibrarianLayout";

// Librarian Pages
import LibrarianDashboard from "./pages/librarian/LibrarianDashboard";
import LibrarianBooks from "./pages/librarian/LibrarianBooks";
import LibrarianRequests from "./pages/librarian/LibrarianRequests";
import LibrarianCirculation from "./pages/librarian/LibrarianCirculation";
import LibrarianStock from "./pages/librarian/LibrarianStock";
import LibrarianAnnouncements from "./pages/librarian/LibrarianAnnouncements";
import LibrarianReports from "./pages/librarian/LibrarianReports";
import LibrarianSettings from "./pages/librarian/LibrarianSettings";

// ========================================
// HEAD OF DEPARTMENT (HOD) PORTAL
// ========================================

// HOD Layout
import HODLayout from "./layouts/HODLayout";

// HOD Pages
import HODDashboard from "./pages/hod/HODDashboard";
import HODFaculty from "./pages/hod/HODFaculty";
import HODStudents from "./pages/hod/HODStudents";
import HODCourseAllocation from "./pages/hod/HODCourseAllocation";
import HODSchedule from "./pages/hod/HODSchedule";
import HODAttendance from "./pages/hod/HODAttendance";
import HODPerformance from "./pages/hod/HODPerformance";
import HODApprovals from "./pages/hod/HODApprovals";
import HODNotices from "./pages/hod/HODNotices";
import HODReports from "./pages/hod/HODReports";
import HODProfile from "./pages/hod/HODProfile";
import HODSettings from "./pages/hod/HODSettings";

// ========================================
// ACCOUNTS OFFICER PORTAL
// ========================================

// Accounts Layout
import AccountsLayout from "./layouts/AccountsLayout";

// Accounts Pages
import AccountsDashboard from "./pages/accounts/AccountsDashboard";
import AccountsStudentFees from "./pages/accounts/AccountsStudentFees";
import AccountsPayments from "./pages/accounts/AccountsPayments";
import AccountsDues from "./pages/accounts/AccountsDues";
import AccountsScholarships from "./pages/accounts/AccountsScholarships";
import AccountsInvoices from "./pages/accounts/AccountsInvoices";
import AccountsRefunds from "./pages/accounts/AccountsRefunds";
import AccountsExpenses from "./pages/accounts/AccountsExpenses";
import AccountsReports from "./pages/accounts/AccountsReports";
import AccountsNotices from "./pages/accounts/AccountsNotices";
import AccountsProfile from "./pages/accounts/AccountsProfile";
import AccountsSettings from "./pages/accounts/AccountsSettings";

// ========================================
// EXAM CONTROLLER PORTAL
// ========================================

// Exam Controller Layout
import ExamControllerLayout from "./layouts/ExamControllerLayout";

// Exam Controller Pages
import ExamControllerDashboard from "./pages/exam-controller/ExamControllerDashboard";
import ExamControllerExams from "./pages/exam-controller/ExamControllerExams";
import ExamControllerSchedule from "./pages/exam-controller/ExamControllerSchedule";
import ExamControllerRegistration from "./pages/exam-controller/ExamControllerRegistration";
import ExamControllerAdmitCards from "./pages/exam-controller/ExamControllerAdmitCards";
import ExamControllerSeatPlans from "./pages/exam-controller/ExamControllerSeatPlans";
import ExamControllerInvigilation from "./pages/exam-controller/ExamControllerInvigilation";
import ExamControllerMarks from "./pages/exam-controller/ExamControllerMarks";
import ExamControllerResults from "./pages/exam-controller/ExamControllerResults";
import ExamControllerNotices from "./pages/exam-controller/ExamControllerNotices";
import ExamControllerProfile from "./pages/exam-controller/ExamControllerProfile";
import ExamControllerSettings from "./pages/exam-controller/ExamControllerSettings";

// ========================================
// MAIN APPLICATION ROUTES
// ========================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================================= */}
        {/* PUBLIC ROUTES                     */}
        {/* ================================= */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* ================================= */}
        {/* STUDENT PORTAL                    */}
        {/* ================================= */}

        <Route
          path="/student"
          element={<StudentLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          {/* Student Academic Pages */}

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

          {/* Student Services */}

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

          {/* Student Account */}

          <Route
            path="profile"
            element={<StudentProfile />}
          />

          <Route
            path="settings"
            element={<StudentSettings />}
          />

        </Route>

        {/* ================================= */}
        {/* FACULTY PORTAL                    */}
        {/* ================================= */}

        <Route
          path="/faculty"
          element={<FacultyLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<FacultyDashboard />}
          />

          <Route
            path="courses"
            element={<FacultyCourses />}
          />

          <Route
            path="attendance"
            element={<FacultyAttendance />}
          />

          <Route
            path="assignments"
            element={<FacultyAssignments />}
          />

          <Route
            path="grading"
            element={<FacultyGrading />}
          />

          <Route
            path="schedule"
            element={<FacultySchedule />}
          />

          <Route
            path="notices"
            element={<FacultyNotices />}
          />

          <Route
            path="messages"
            element={<FacultyMessages />}
          />

          <Route
            path="profile"
            element={<FacultyProfile />}
          />

          <Route
            path="settings"
            element={<FacultySettings />}
          />

        </Route>

        {/* ================================= */}
        {/* ADMIN PORTAL                      */}
        {/* ================================= */}

        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="analytics"
            element={<AdminAnalytics />}
          />

          <Route
            path="students"
            element={<AdminStudents />}
          />

          <Route
            path="faculty"
            element={<AdminFaculty />}
          />

          <Route
            path="users"
            element={<AdminUsers />}
          />

          <Route
            path="departments"
            element={<AdminDepartments />}
          />

          <Route
            path="courses"
            element={<AdminCourses />}
          />

          <Route
            path="enrollment"
            element={<AdminEnrollment />}
          />

          <Route
            path="attendance"
            element={<AdminAttendance />}
          />

          <Route
            path="examinations"
            element={<AdminExaminations />}
          />

          <Route
            path="results"
            element={<AdminResults />}
          />

          <Route
            path="timetable"
            element={<AdminTimetable />}
          />

          <Route
            path="notices"
            element={<AdminNotices />}
          />

          <Route
            path="finance"
            element={<AdminFinance />}
          />

          <Route
            path="library"
            element={<AdminLibrary />}
          />

          <Route
            path="events"
            element={<AdminEvents />}
          />

          <Route
            path="reports"
            element={<AdminReports />}
          />

          <Route
            path="settings"
            element={<AdminSettings />}
          />

        </Route>

        {/* ================================= */}
        {/* LIBRARIAN PORTAL                  */}
        {/* ================================= */}

        <Route
          path="/librarian"
          element={<LibrarianLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<LibrarianDashboard />}
          />

          <Route
            path="books"
            element={<LibrarianBooks />}
          />

          <Route
            path="requests"
            element={<LibrarianRequests />}
          />

          <Route
            path="circulation"
            element={<LibrarianCirculation />}
          />

          <Route
            path="stock"
            element={<LibrarianStock />}
          />

          <Route
            path="announcements"
            element={<LibrarianAnnouncements />}
          />

          <Route
            path="reports"
            element={<LibrarianReports />}
          />

          <Route
            path="settings"
            element={<LibrarianSettings />}
          />

        </Route>

        {/* ================================= */}
        {/* HEAD OF DEPARTMENT PORTAL         */}
        {/* ================================= */}

        <Route
          path="/hod"
          element={<HODLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<HODDashboard />}
          />

          <Route
            path="faculty"
            element={<HODFaculty />}
          />

          <Route
            path="students"
            element={<HODStudents />}
          />

          <Route
            path="course-allocation"
            element={<HODCourseAllocation />}
          />

          <Route
            path="schedule"
            element={<HODSchedule />}
          />

          <Route
            path="attendance"
            element={<HODAttendance />}
          />

          <Route
            path="performance"
            element={<HODPerformance />}
          />

          <Route
            path="approvals"
            element={<HODApprovals />}
          />

          <Route
            path="notices"
            element={<HODNotices />}
          />

          <Route
            path="reports"
            element={<HODReports />}
          />

          <Route
            path="profile"
            element={<HODProfile />}
          />

          <Route
            path="settings"
            element={<HODSettings />}
          />

        </Route>

        {/* ================================= */}
        {/* ACCOUNTS OFFICER PORTAL           */}
        {/* ================================= */}

        <Route
          path="/accounts"
          element={<AccountsLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<AccountsDashboard />}
          />

          <Route
            path="student-fees"
            element={<AccountsStudentFees />}
          />

          <Route
            path="payments"
            element={<AccountsPayments />}
          />

          <Route
            path="dues"
            element={<AccountsDues />}
          />

          <Route
            path="scholarships"
            element={<AccountsScholarships />}
          />

          <Route
            path="invoices"
            element={<AccountsInvoices />}
          />

          <Route
            path="refunds"
            element={<AccountsRefunds />}
          />

          <Route
            path="expenses"
            element={<AccountsExpenses />}
          />

          <Route
            path="reports"
            element={<AccountsReports />}
          />

          <Route
            path="notices"
            element={<AccountsNotices />}
          />

          <Route
            path="profile"
            element={<AccountsProfile />}
          />

          <Route
            path="settings"
            element={<AccountsSettings />}
          />

        </Route>

        {/* ================================= */}
        {/* EXAM CONTROLLER PORTAL            */}
        {/* ================================= */}

        <Route
          path="/exam-controller"
          element={<ExamControllerLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          {/* Dashboard */}

          <Route
            path="dashboard"
            element={<ExamControllerDashboard />}
          />

          {/* Examination Management */}

          <Route
            path="exams"
            element={<ExamControllerExams />}
          />

          {/* Examination Schedule */}

          <Route
            path="schedule"
            element={<ExamControllerSchedule />}
          />

          {/* Student Course Registration */}

          <Route
            path="registration"
            element={<ExamControllerRegistration />}
          />

          {/* Admit Card Management */}

          <Route
            path="admit-cards"
            element={<ExamControllerAdmitCards />}
          />

          {/* Seat Plan Management */}

          <Route
            path="seat-plans"
            element={<ExamControllerSeatPlans />}
          />

          {/* Invigilation Management */}

          <Route
            path="invigilation"
            element={<ExamControllerInvigilation />}
          />

          {/* Marks Management */}

          <Route
            path="marks"
            element={<ExamControllerMarks />}
          />

          {/* Results and Publishing */}

          <Route
            path="results"
            element={<ExamControllerResults />}
          />

          {/* Examination Notices */}

          <Route
            path="notices"
            element={<ExamControllerNotices />}
          />

          {/* Exam Controller Profile */}

          <Route
            path="profile"
            element={<ExamControllerProfile />}
          />

          {/* Exam Controller Settings */}

          <Route
            path="settings"
            element={<ExamControllerSettings />}
          />

        </Route>

        {/* ================================= */}
        {/* UNKNOWN URL FALLBACK              */}
        {/* ================================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
