import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  ActivityItem,
  DashboardMetric,
  DistributionItem,
  HighlightItem,
  QuickAction,
} from "@/features/home/dashboard";
import { HomePage } from "@/features/home/HomePage";

const dashboard = vi.hoisted(() => {
  const kpis: DashboardMetric[] = [
    { label: "Usuarios", value: "12", detail: "Cuentas registradas", tone: "stable" },
  ];
  const highlights: HighlightItem[] = [
    { title: "Informe trimestral", description: "Pendiente de revisión", meta: "Equipo A", value: "3" },
  ];
  const recentActivity: ActivityItem[] = [
    { title: "Alta de usuario", summary: "Se creó la cuenta ana", time: "10:15", status: "Hecho" },
  ];
  const quickActions: QuickAction[] = [
    { title: "Crear usuario", description: "Da de alta una cuenta", hint: "Administración" },
  ];
  const distribution: DistributionItem[] = [
    { name: "Administradores", description: "Usuarios con rol admin", trend: "+1" },
  ];
  return { kpis, highlights, recentActivity, quickActions, distribution };
});

vi.mock("@/features/home/dashboard", () => dashboard);

describe("HomePage", () => {
  it("muestra las cuatro secciones del dashboard", () => {
    render(<HomePage />);

    for (const heading of [
      "Elementos destacados",
      "Últimas acciones",
      "Acciones rápidas",
      "Distribución",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("pinta los elementos de cada lista", () => {
    render(<HomePage />);

    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Informe trimestral")).toBeInTheDocument();
    expect(screen.getByText("Equipo A")).toBeInTheDocument();
    expect(screen.getByText("Alta de usuario")).toBeInTheDocument();
    expect(screen.getByText("10:15")).toBeInTheDocument();
    expect(screen.getByText("Crear usuario")).toBeInTheDocument();
    expect(screen.getByText("Administradores")).toBeInTheDocument();
  });
});
