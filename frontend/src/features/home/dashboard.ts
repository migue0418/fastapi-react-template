export type DashboardMetricTone = "alert" | "focus" | "stable" | "positive";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: DashboardMetricTone;
};

export type InventoryAlert = {
  reference: string;
  description: string;
  location: string;
  stock: string;
};

export type RecentMovement = {
  reference: string;
  summary: string;
  time: string;
  status: string;
};

export type QuickAction = {
  title: string;
  description: string;
  hint: string;
};

export type CategoryHighlight = {
  name: string;
  description: string;
  trend: string;
};

export const kpis: DashboardMetric[] = [
  { label: "Métrica 1", value: "—", detail: "Descripción de la métrica", tone: "stable" },
  { label: "Métrica 2", value: "—", detail: "Descripción de la métrica", tone: "positive" },
  { label: "Métrica 3", value: "—", detail: "Descripción de la métrica", tone: "focus" },
  { label: "Métrica 4", value: "—", detail: "Descripción de la métrica", tone: "alert" },
];

export const inventoryAlerts: InventoryAlert[] = [];

export const recentMovements: RecentMovement[] = [];

export const quickActions: QuickAction[] = [
  {
    title: "Añade tus funcionalidades",
    description: "Crea nuevas features en frontend/src/features/ y backend/app/features/.",
    hint: "Sigue la arquitectura por slice del proyecto",
  },
];

export const categoryHighlights: CategoryHighlight[] = [];
