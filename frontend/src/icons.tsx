import type { ComponentType } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Ellipsis,
  Eye,
  House,
  Image as ImageIcon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { PageId } from "./types";

export type AppIcon = ComponentType<LucideProps>;

const createAppIcon = (Icon: LucideIcon): AppIcon => {
  const AppIconComponent = (props: LucideProps) => (
    <Icon
      {...props}
      aria-hidden="true"
      focusable="false"
      strokeWidth={1.8}
    />
  );
  AppIconComponent.displayName = `AppIcon(${Icon.displayName ?? Icon.name})`;
  return AppIconComponent;
};

export const icons: Record<PageId, AppIcon> = {
  home: createAppIcon(House),
  items: createAppIcon(Package),
  sales: createAppIcon(ReceiptText),
  purchases: createAppIcon(ShoppingCart),
  reports: createAppIcon(ChartNoAxesCombined),
};

export const appIcons = {
  actions: {
    add: createAppIcon(Plus),
    delete: createAppIcon(Trash2),
    edit: createAppIcon(Pencil),
    more: createAppIcon(Ellipsis),
    payment: createAppIcon(CircleDollarSign),
    remove: createAppIcon(X),
    search: createAppIcon(Search),
    settings: createAppIcon(Settings),
    view: createAppIcon(Eye),
  },
  direction: {
    back: createAppIcon(ArrowLeft),
    forward: createAppIcon(ArrowRight),
  },
  disclosure: {
    down: createAppIcon(ChevronDown),
  },
  media: {
    image: createAppIcon(ImageIcon),
  },
  sidebar: {
    collapseLeft: createAppIcon(PanelLeftClose),
    collapseRight: createAppIcon(PanelRightClose),
    expandLeft: createAppIcon(PanelLeftOpen),
    expandRight: createAppIcon(PanelRightOpen),
  },
} as const;
