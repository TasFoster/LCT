import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { RequireAdmin, RequireAuth } from './guards';
import { ROUTES } from '../shared/config/routes';
import { LandingPage } from '../pages/public/LandingPage';
import { CatalogPage } from '../pages/public/CatalogPage';
import { CatalogItemPage } from '../pages/public/CatalogItemPage';
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../pages/auth/AuthPages';
import { ProjectsListPage } from '../pages/projects/ProjectsListPage';
import { NewProjectPage } from '../pages/projects/NewProjectPage';
import { ProjectOverviewPage } from '../pages/projects/ProjectOverviewPage';
import { ProjectVersionsPage } from '../pages/projects/ProjectVersionsPage';
import { ProjectVersionSnapshotPage } from '../pages/projects/ProjectVersionSnapshotPage';
import { DashboardPage } from '../pages/projects/DashboardPage';
import { ReportPage } from '../pages/projects/ReportPage';
import { ProfilePage } from '../pages/projects/ProfilePage';
import { WizardEntry, WizardPage } from '../pages/wizard/WizardPage';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { AdminHomePage } from '../pages/admin/AdminHomePage';
import { AdminCatalogPage } from '../pages/admin/AdminCatalogPage';
import { AdminCatalogItemPage } from '../pages/admin/AdminCatalogItemPage';
import { AdminRulesPage } from '../pages/admin/AdminRulesPage';
import { AdminAssumptionsPage, AdminDictionariesPage, AdminUsersPage } from '../pages/admin/AdminSettingsPages';
import { ForbiddenPage, NotFoundPage } from '../pages/errors';
import { ObjectParamsWireframe } from '../pages/wireframes/ObjectParamsWireframe';
import { DashboardWireframe } from '../pages/wireframes/DashboardWireframe';

/** Все маршруты — по карте экранов Документация/Фронтенд и визард/architecture/pages.md. */
export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Публичная зона */}
          <Route path={ROUTES.landing} element={<LandingPage />} />
          <Route path={ROUTES.catalog} element={<CatalogPage />} />
          <Route path={ROUTES.catalogItem()} element={<CatalogItemPage />} />
          <Route path={ROUTES.demo} element={<WizardEntry demo />} />
          <Route path={ROUTES.demoStep()} element={<WizardPage demo />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />

          {/* Личный кабинет */}
          <Route
            element={
              <RequireAuth>
                <Outlet />
              </RequireAuth>
            }
          >
            <Route path={ROUTES.projects} element={<ProjectsListPage />} />
            <Route path={ROUTES.newProject} element={<NewProjectPage />} />
            <Route path={ROUTES.project()} element={<ProjectOverviewPage />} />
            <Route path={ROUTES.versions()} element={<ProjectVersionsPage />} />
            <Route path={ROUTES.versionSnapshot()} element={<ProjectVersionSnapshotPage />} />
            <Route path={ROUTES.dashboard()} element={<DashboardPage />} />
            <Route path={ROUTES.report()} element={<ReportPage />} />
            <Route path={ROUTES.wizard()} element={<WizardEntry />} />
            <Route path={ROUTES.wizardStep()} element={<WizardPage />} />
            <Route path={ROUTES.profile} element={<ProfilePage />} />
          </Route>

          {/* Админ-зона */}
          <Route
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route path={ROUTES.admin} element={<AdminHomePage />} />
            <Route path={ROUTES.adminCatalog} element={<AdminCatalogPage />} />
            <Route path={ROUTES.adminCatalogItem()} element={<AdminCatalogItemPage />} />
            <Route path={ROUTES.adminRules} element={<AdminRulesPage />} />
            <Route path={ROUTES.adminDictionaries} element={<AdminDictionariesPage />} />
            <Route path={ROUTES.adminAssumptions} element={<AdminAssumptionsPage />} />
            <Route path={ROUTES.adminUsers} element={<AdminUsersPage />} />
          </Route>

          <Route path={ROUTES.forbidden} element={<ForbiddenPage />} />
          <Route path={ROUTES.notFound} element={<NotFoundPage />} />
        </Route>

        {/* Вайрфреймы — без общей шапки, чтобы макет читался как макет */}
        <Route path={ROUTES.wireframeParams} element={<ObjectParamsWireframe />} />
        <Route path={ROUTES.wireframeDashboard} element={<DashboardWireframe />} />

        <Route path="*" element={<Navigate to={ROUTES.notFound} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
