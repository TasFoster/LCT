import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { RequireAdmin, RequireAuth } from './guards';
import { ROUTES } from '../shared/config/routes';
import { CatalogItemPage, CatalogPage, DemoPage, LandingPage } from '../pages/public';
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../pages/auth';
import {
  NewProjectPage,
  ProfilePage,
  ProjectDashboardPage,
  ProjectOverviewPage,
  ProjectReportPage,
  ProjectVersionsPage,
  ProjectsListPage,
} from '../pages/projects';
import { WizardPage } from '../pages/wizard/WizardPage';
import {
  AdminAssumptionsPage,
  AdminCatalogItemPage,
  AdminCatalogPage,
  AdminDictionariesPage,
  AdminHomePage,
  AdminRulesPage,
  AdminUsersPage,
} from '../pages/admin';
import { ForbiddenPage, NotFoundPage } from '../pages/errors';
import { ObjectParamsWireframe } from '../pages/wireframes/ObjectParamsWireframe';
import { DashboardWireframe } from '../pages/wireframes/DashboardWireframe';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Публичная зона */}
          <Route path={ROUTES.landing} element={<LandingPage />} />
          <Route path={ROUTES.catalog} element={<CatalogPage />} />
          <Route path={ROUTES.catalogItem()} element={<CatalogItemPage />} />
          <Route path={ROUTES.demo} element={<DemoPage />} />
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
            <Route path={ROUTES.dashboard()} element={<ProjectDashboardPage />} />
            <Route path={ROUTES.report()} element={<ProjectReportPage />} />
            <Route path={ROUTES.wizardStep()} element={<WizardPage />} />
            <Route path={ROUTES.profile} element={<ProfilePage />} />
          </Route>

          {/* Админ-зона */}
          <Route
            element={
              <RequireAdmin>
                <Outlet />
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
