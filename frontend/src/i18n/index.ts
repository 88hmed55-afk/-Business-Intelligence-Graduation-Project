import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { applyLanguage, useLanguageStore, type Language } from "@/stores/language-store";

import enActivityLogs from "./locales/en/activityLogs.json";
import enAuth from "./locales/en/auth.json";
import enBi from "./locales/en/bi.json";
import enCategories from "./locales/en/categories.json";
import enCommon from "./locales/en/common.json";
import enCustomers from "./locales/en/customers.json";
import enDashboard from "./locales/en/dashboard.json";
import enDashboards from "./locales/en/dashboards.json";
import enEmployees from "./locales/en/employees.json";
import enInventory from "./locales/en/inventory.json";
import enKpis from "./locales/en/kpis.json";
import enNav from "./locales/en/nav.json";
import enNotifications from "./locales/en/notifications.json";
import enOrders from "./locales/en/orders.json";
import enPayments from "./locales/en/payments.json";
import enProducts from "./locales/en/products.json";
import enProfile from "./locales/en/profile.json";
import enReports from "./locales/en/reports.json";
import enRoles from "./locales/en/roles.json";
import enSettings from "./locales/en/settings.json";
import enSuppliers from "./locales/en/suppliers.json";
import enUsers from "./locales/en/users.json";

import arActivityLogs from "./locales/ar/activityLogs.json";
import arAuth from "./locales/ar/auth.json";
import arBi from "./locales/ar/bi.json";
import arCategories from "./locales/ar/categories.json";
import arCommon from "./locales/ar/common.json";
import arCustomers from "./locales/ar/customers.json";
import arDashboard from "./locales/ar/dashboard.json";
import arDashboards from "./locales/ar/dashboards.json";
import arEmployees from "./locales/ar/employees.json";
import arInventory from "./locales/ar/inventory.json";
import arKpis from "./locales/ar/kpis.json";
import arNav from "./locales/ar/nav.json";
import arNotifications from "./locales/ar/notifications.json";
import arOrders from "./locales/ar/orders.json";
import arPayments from "./locales/ar/payments.json";
import arProducts from "./locales/ar/products.json";
import arProfile from "./locales/ar/profile.json";
import arReports from "./locales/ar/reports.json";
import arRoles from "./locales/ar/roles.json";
import arSettings from "./locales/ar/settings.json";
import arSuppliers from "./locales/ar/suppliers.json";
import arUsers from "./locales/ar/users.json";

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    dashboard: enDashboard,
    bi: enBi,
    customers: enCustomers,
    suppliers: enSuppliers,
    products: enProducts,
    categories: enCategories,
    inventory: enInventory,
    orders: enOrders,
    payments: enPayments,
    employees: enEmployees,
    roles: enRoles,
    users: enUsers,
    kpis: enKpis,
    notifications: enNotifications,
    activityLogs: enActivityLogs,
    reports: enReports,
    dashboards: enDashboards,
    settings: enSettings,
    profile: enProfile,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    auth: arAuth,
    dashboard: arDashboard,
    bi: arBi,
    customers: arCustomers,
    suppliers: arSuppliers,
    products: arProducts,
    categories: arCategories,
    inventory: arInventory,
    orders: arOrders,
    payments: arPayments,
    employees: arEmployees,
    roles: arRoles,
    users: arUsers,
    kpis: arKpis,
    notifications: arNotifications,
    activityLogs: arActivityLogs,
    reports: arReports,
    dashboards: arDashboards,
    settings: arSettings,
    profile: arProfile,
  },
} as const;

export const defaultNS = "common";

export const namespaces = Object.keys(resources.en);

export function getInitialLanguage(): Language {
  const stored = useLanguageStore.getState().language;
  return stored === "ar" || stored === "en" ? stored : "en";
}

void i18n.use(initReactI18next).init({
  resources: resources as unknown as Record<string, Record<string, Record<string, unknown>>>,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  defaultNS,
  ns: namespaces,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on("languageChanged", (language: string) => {
  applyLanguage((language === "ar" || language === "en" ? language : "en") as Language);
});

export function setAppLanguage(language: Language): void {
  useLanguageStore.getState().setLanguage(language);
  void i18n.changeLanguage(language);
}

export default i18n;
