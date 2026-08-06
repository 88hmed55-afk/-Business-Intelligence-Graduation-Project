import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AdminRoute } from "@/app/router/AdminRoute";
import { ProtectedRoute } from "@/app/router/ProtectedRoute";
import { RouteError } from "@/app/router/RouteError";

const AnalyticsPage = lazy(() =>
  import("@/features/analytics/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })),
);
const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then(m => ({ default: m.LoginPage })),
);
const ActivityLogsPage = lazy(() =>
  import("@/features/activity-logs/ActivityLogsPage").then(m => ({ default: m.ActivityLogsPage })),
);
const ExecutiveDashboard = lazy(() =>
  import("@/features/bi/ExecutiveDashboard").then(m => ({ default: m.ExecutiveDashboard })),
);
const ForecastPage = lazy(() =>
  import("@/features/bi/ForecastPage").then(m => ({ default: m.ForecastPage })),
);
const InsightsPage = lazy(() =>
  import("@/features/bi/InsightsPage").then(m => ({ default: m.InsightsPage })),
);
const TrendsPage = lazy(() =>
  import("@/features/bi/TrendsPage").then(m => ({ default: m.TrendsPage })),
);
const CategoriesPage = lazy(() =>
  import("@/features/categories/CategoriesPage").then(m => ({ default: m.CategoriesPage })),
);
const CustomersPage = lazy(() =>
  import("@/features/customers/CustomersPage").then(m => ({ default: m.CustomersPage })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })),
);
const DashboardsPage = lazy(() =>
  import("@/features/dashboards/DashboardsPage").then(m => ({ default: m.DashboardsPage })),
);
const DashboardDetailPage = lazy(() =>
  import("@/features/dashboards/DashboardDetailPage").then(m => ({ default: m.DashboardDetailPage })),
);
const EmployeesPage = lazy(() =>
  import("@/features/employees/EmployeesPage").then(m => ({ default: m.EmployeesPage })),
);
const InventoryPage = lazy(() =>
  import("@/features/inventory/InventoryPage").then(m => ({ default: m.InventoryPage })),
);
const KpisPage = lazy(() =>
  import("@/features/kpis/KpisPage").then(m => ({ default: m.KpisPage })),
);
const NotificationsPage = lazy(() =>
  import("@/features/notifications/NotificationsPage").then(m => ({ default: m.NotificationsPage })),
);
const OrdersPage = lazy(() =>
  import("@/features/orders/OrdersPage").then(m => ({ default: m.OrdersPage })),
);
const PaymentsPage = lazy(() =>
  import("@/features/payments/PaymentsPage").then(m => ({ default: m.PaymentsPage })),
);
const ProductsPage = lazy(() =>
  import("@/features/products/ProductsPage").then(m => ({ default: m.ProductsPage })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile/ProfilePage").then(m => ({ default: m.ProfilePage })),
);
const ReportsIndex = lazy(() =>
  import("@/features/reports/ReportsIndex").then(m => ({ default: m.ReportsIndex })),
);
const RolesPage = lazy(() =>
  import("@/features/roles/RolesPage").then(m => ({ default: m.RolesPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then(m => ({ default: m.SettingsPage })),
);
const SuppliersPage = lazy(() =>
  import("@/features/suppliers/SuppliersPage").then(m => ({ default: m.SuppliersPage })),
);
const UsersPage = lazy(() =>
  import("@/features/users/UsersPage").then(m => ({ default: m.UsersPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })),
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <ExecutiveDashboard /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "forecasting", element: <ForecastPage /> },
      { path: "insights", element: <InsightsPage /> },
      { path: "trends", element: <TrendsPage /> },
      { path: "dashboards", element: <DashboardsPage /> },
      { path: "dashboards/:id", element: <DashboardDetailPage /> },
      { path: "reports", element: <ReportsIndex /> },
      { path: "kpis", element: <KpisPage /> },
      {
        path: "users",
        element: (
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        ),
      },
      { path: "customers", element: <CustomersPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "suppliers", element: <SuppliersPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "employees", element: <EmployeesPage /> },
      {
        path: "roles",
        element: (
          <AdminRoute>
            <RolesPage />
          </AdminRoute>
        ),
      },
      {
        path: "activity-logs",
        element: (
          <AdminRoute>
            <ActivityLogsPage />
          </AdminRoute>
        ),
      },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
