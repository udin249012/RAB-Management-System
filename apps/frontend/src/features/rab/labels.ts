import { RabItemMode, RabStatus } from "@rab/shared-types";
import type { BadgeProps } from "@/components/ui/badge";

export const RAB_STATUS_LABELS: Record<RabStatus, string> = {
  [RabStatus.DRAFT]: "Draft",
  [RabStatus.REVIEW]: "Review",
  [RabStatus.FINAL]: "Final",
  [RabStatus.REVISION]: "Revisi",
  [RabStatus.ARCHIVED]: "Arsip",
};

export const RAB_STATUS_VARIANTS: Record<RabStatus, BadgeProps["variant"]> = {
  [RabStatus.DRAFT]: "secondary",
  [RabStatus.REVIEW]: "accent",
  [RabStatus.FINAL]: "default",
  [RabStatus.REVISION]: "outline",
  [RabStatus.ARCHIVED]: "outline",
};

export const RAB_MODE_LABELS: Record<RabItemMode, string> = {
  [RabItemMode.MANUAL]: "Manual",
  [RabItemMode.AHSP]: "Berbasis AHSP",
};
