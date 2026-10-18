import {
  Banknote,
  BriefcaseBusiness,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Utensils,
  Wallet,
} from "lucide-react";

const icons = {
  utensils: Utensils,
  home: House,
  car: Car,
  "heart-pulse": HeartPulse,
  "briefcase-business": BriefcaseBusiness,
  plane: Plane,
  shirt: Shirt,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  "shopping-cart": ShoppingCart,
  coffee: Coffee,
  "gamepad-2": Gamepad2,
  gift: Gift,
  banknote: Banknote,
  "credit-card": CreditCard,
  landmark: Landmark,
  smartphone: Smartphone,
  receipt: Receipt,
  "more-horizontal": MoreHorizontal,
  bank: Landmark,
  wallet: Wallet,
  credit: CreditCard,
  savings: PiggyBank,
};

export function FinancialIcon({
  name,
  size = 20,
}: {
  name?: string | null;
  size?: number;
}) {
  const Icon = icons[name as keyof typeof icons] || Wallet;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
