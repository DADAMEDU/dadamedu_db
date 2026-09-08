import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth, RequireAdmin } from "@/auth/RequireAuth";
import { LoginPage } from "@/auth/LoginPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/ui/toast";

const DashboardPage = React.lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const SearchPage = React.lazy(() => import("@/features/search/SearchPage").then((m) => ({ default: m.SearchPage })));
const BranchListPage = React.lazy(() =>
  import("@/features/organizations/BranchListPage").then((m) => ({ default: m.BranchListPage }))
);
const AgencyListPage = React.lazy(() =>
  import("@/features/organizations/AgencyListPage").then((m) => ({ default: m.AgencyListPage }))
);
const OrganizationDetailPage = React.lazy(() =>
  import("@/features/organizations/OrganizationDetailPage").then((m) => ({ default: m.OrganizationDetailPage }))
);
const OrganizationFormPage = React.lazy(() =>
  import("@/features/organizations/OrganizationFormPage").then((m) => ({ default: m.OrganizationFormPage }))
);
const ImportWizardPage = React.lazy(() =>
  import("@/features/import/ImportWizardPage").then((m) => ({ default: m.ImportWizardPage }))
);
const ExportPage = React.lazy(() => import("@/features/export/ExportPage").then((m) => ({ default: m.ExportPage })));
const ApprovalsPage = React.lazy(() =>
  import("@/features/approvals/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage }))
);
const UsersPage = React.lazy(() => import("@/features/users/UsersPage").then((m) => ({ default: m.UsersPage })));
const AuditLogPage = React.lazy(() => import("@/features/audit/AuditLogPage").then((m) => ({ default: m.AuditLogPage })));
const SettingsPage = React.lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

function PageFallback() {
  return <div className="p-6 text-sm text-muted-foreground">불러오는 중...</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <React.Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/branches" element={<BranchListPage />} />
                <Route path="/agencies" element={<AgencyListPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/organizations/new" element={<OrganizationFormPage />} />
                <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
                <Route path="/organizations/:id/edit" element={<OrganizationFormPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                <Route element={<RequireAdmin />}>
                  <Route path="/import" element={<ImportWizardPage />} />
                  <Route path="/export" element={<ExportPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/audit-logs" element={<AuditLogPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </React.Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
