import { Navigate, RouteObject } from "react-router-dom";
import PatientDashboard from "@/features/dashboard/pages/PatientDashboard";
import PatientAppointmentsPage from "@/features/dashboard/pages/AppointmentsPage";
import DashboardJournalPage from "@/features/dashboard/pages/JournalPage";
import FavoritesPage from "@/features/dashboard/pages/FavoritesPage";
import Settings from "@/features/dashboard/pages/Settings";
import Profile from "@/features/dashboard/pages/Profile";
import DeleteAccount from "@/features/dashboard/pages/DeleteAccount";
import StressReportPage from "@/features/dashboard/pages/StressReportPage";

// Import journal pages
import JournalPage from "@/features/journal/pages/JournalPage";
import JournalEntryPage from "@/features/journal/pages/JournalEntryPage";
import JournalArchive from "@/features/journal/pages/JournalArchive";

// The dashboard routes structure, with proper nesting
const dashboardRoutes: RouteObject[] = [
  {
    path: "/patient-dashboard",
    children: [
      {
        index: true,
        element: <PatientDashboard />
      },
      {
        path: "appointments",
        element: <PatientAppointmentsPage />
      },
      {
        path: "reports",
        element: <StressReportPage />
      },
      {
        path: "journal",
        children: [
          {
            index: true,
            element: <DashboardJournalPage />
          },
          {
            path: "new",
            element: <JournalPage />
          },
          {
            path: ":entryId",
            element: <JournalEntryPage />
          },
          {
            path: "archive",
            element: <JournalArchive />
          }
        ]
      },
      {
        path: "favorites",
        element: <FavoritesPage />
      },
      {
        path: "settings",
        children: [
          {
            index: true,
            element: <Settings />
          },
          {
            path: "profile",
            element: <Profile />
          },
          {
            path: "delete-account",
            element: <DeleteAccount />
          }
        ]
      },
      {
        path: "*",
        element: <Navigate to="/patient-dashboard" replace />
      }
    ]
  }
];

export default dashboardRoutes; 