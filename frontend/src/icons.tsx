import type { ComponentType } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  ChevronDown,
  House,
  Image as ImageIcon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  ReceiptText,
  Settings,
  ShoppingCart,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { PageId } from "./types";

export type XBooksIcon = ComponentType<LucideProps>;

const xbooksIcon = (Icon: LucideIcon): XBooksIcon => {
  const XBooksIconComponent = (props: LucideProps) => (
    <Icon
      {...props}
      aria-hidden="true"
      focusable="false"
      strokeWidth={1.8}
    />
  );
  XBooksIconComponent.displayName = `XBooksIcon(${Icon.displayName ?? Icon.name})`;
  return XBooksIconComponent;
};

export const icons: Record<PageId, XBooksIcon> = {
  home: xbooksIcon(House),
  items: xbooksIcon(Package),
  sales: xbooksIcon(ReceiptText),
  purchases: xbooksIcon(ShoppingCart),
  reports: xbooksIcon(ChartNoAxesCombined),
};

export const appIcons = {
  actions: {
    add: xbooksIcon(Plus),
    remove: xbooksIcon(X),
    settings: xbooksIcon(Settings),
  },
  direction: {
    back: xbooksIcon(ArrowLeft),
    forward: xbooksIcon(ArrowRight),
  },
  disclosure: {
    down: xbooksIcon(ChevronDown),
  },
  media: {
    image: xbooksIcon(ImageIcon),
  },
  sidebar: {
    collapseLeft: xbooksIcon(PanelLeftClose),
    collapseRight: xbooksIcon(PanelRightClose),
    expandLeft: xbooksIcon(PanelLeftOpen),
    expandRight: xbooksIcon(PanelRightOpen),
  },
} as const;
