import { ProjectStatus } from "@rab/shared-types";
import type { BadgeProps } from "@/components/ui/badge";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.PLANNING]: "Perencanaan",
  [ProjectStatus.IN_PROGRESS]: "Berjalan",
  [ProjectStatus.ON_HOLD]: "Ditunda",
  [ProjectStatus.COMPLETED]: "Selesai",
  [ProjectStatus.CANCELLED]: "Dibatalkan",
};

export const PROJECT_STATUS_VARIANTS: Record<ProjectStatus, BadgeProps["variant"]> = {
  [ProjectStatus.PLANNING]: "secondary",
  [ProjectStatus.IN_PROGRESS]: "default",
  [ProjectStatus.ON_HOLD]: "accent",
  [ProjectStatus.COMPLETED]: "outline",
  [ProjectStatus.CANCELLED]: "destructive",
};
