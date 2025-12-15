import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

export type NavEntry<T> = {
  name: string;
  icon: LucideIcon;
  target: T;
};

export interface NavItemProps<T> {
  groupName: string;
  entry: NavEntry<T>;
  isActive: boolean;
  setActiveEntry: (item: NavEntry<T>) => void;
  className?: string;
}

export function NavItem<T>({
  groupName,
  entry,
  isActive,
  setActiveEntry,
  className = "",
}: NavItemProps<T>) {
  const Icon = entry.icon;
  const pillLayoutId = `active-pill-${groupName}`;
  const iconLayoutId = `active-icon-${groupName}`;
  return (
    <div
      onClick={() => setActiveEntry(entry)}
      className={`relative z-10 flex cursor-pointer flex-row items-center justify-center gap-2 px-2 py-0.5 text-sm font-medium text-white transition-colors duration-300 hover:text-gray-200 ${className}`}
    >
      {isActive && (
        <motion.div
          layoutId={pillLayoutId}
          className="absolute inset-0 -z-10 rounded-md bg-primary/60"
        />
      )}
      {isActive && (
        <motion.div layoutId={iconLayoutId}>
          <Icon className="w-4" />
        </motion.div>
      )}
      <motion.div layout className="relative z-20">
        {entry.name}
      </motion.div>
    </div>
  );
}
