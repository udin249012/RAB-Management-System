import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/router/PublicOnlyRoute";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoginPage } from "@/pages/auth/LoginPage";

const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("@/pages/projects/ProjectDetailPage"));
const RabListPage = lazy(() => import("@/pages/rab/RabListPage"));
const RabEditorPage = lazy(() => import("@/pages/rab/RabEditorPage"));
const RabDetailPage = lazy(() => import("@/pages/rab/RabDetailPage"));
const CatalogPage = lazy(() => import("@/pages/catalog/CatalogPage"));
const AhspPage = lazy(() => import("@/pages/ahsp/AhspPage"));
const MonitoringPage = lazy(() => import("@/pages/monitoring/MonitoringPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState rows={4} />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <LazyPage>
                  <DashboardPage />
                </LazyPage>
              }
            />
            <Route
              path="/projects"
              element={
                <LazyPage>
                  <ProjectsPage />
                </LazyPage>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <LazyPage>
                  <ProjectDetailPage />
                </LazyPage>
              }
            />
            <Route
              path="/rab"
              element={
                <LazyPage>
                  <RabListPage />
                </LazyPage>
              }
            />
            <Route
              path="/rab/new"
              element={
                <LazyPage>
                  <RabEditorPage />
                </LazyPage>
              }
            />
            <Route
              path="/rab/:id"
              element={
                <LazyPage>
                  <RabDetailPage />
                </LazyPage>
              }
            />
            <Route
              path="/rab/:id/edit"
              element={
                <LazyPage>
                  <RabEditorPage />
                </LazyPage>
              }
            />
            <Route
              path="/catalog"
              element={
                <LazyPage>
                  <CatalogPage />
                </LazyPage>
              }
            />
            <Route
              path="/ahsp"
              element={
                <LazyPage>
                  <AhspPage />
                </LazyPage>
              }
            />
            <Route
              path="/monitoring"
              element={
                <LazyPage>
                  <MonitoringPage />
                </LazyPage>
              }
            />
            <Route
              path="/reports"
              element={
                <LazyPage>
                  <ReportsPage />
                </LazyPage>
              }
            />
            <Route
              path="/settings"
              element={
                <LazyPage>
                  <SettingsPage />
                </LazyPage>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
