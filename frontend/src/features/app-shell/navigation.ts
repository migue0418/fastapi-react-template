import { createElement } from "react";
import type { ComponentType, SVGProps } from "react";

type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return createElement(
    "svg",
    { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, ...props },
    createElement("path", { d: "M4 13.5h5.5V20H4z" }),
    createElement("path", { d: "M14.5 4H20v16h-5.5z" }),
    createElement("path", { d: "M4 4h5.5v6H4z" }),
    createElement("path", { d: "M14.5 9.5H20" }),
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return createElement(
    "svg",
    { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, ...props },
    createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" }),
    createElement("circle", { cx: "9.5", cy: "7", r: "4" }),
    createElement("path", { d: "M20 8v6" }),
    createElement("path", { d: "M23 11h-6" }),
  );
}


export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon?: SvgIcon;
  section?: string;
  children?: NavigationItem[];
  requiredRoles?: string[];
};

export const navigation: NavigationItem[] = [
  {
    id: "home",
    label: "Dashboard",
    path: "/",
    icon: DashboardIcon,
    section: "principal",
  },
  {
    id: "users",
    label: "Usuarios",
    path: "/usuarios",
    icon: UsersIcon,
    section: "admin",
    requiredRoles: ["admin"],
  },
];
