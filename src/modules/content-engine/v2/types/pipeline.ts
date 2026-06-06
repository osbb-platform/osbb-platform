import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminCommand } from "./commands";

export type HandlerContext = {
  supabase: SupabaseClient;
  command: AdminCommand;
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    role: string | null;
  };
  house: {
    id: string;
    slug: string;
    name: string;
  };
};

export type BootstrapContext = {
  supabase: SupabaseClient;
  houseId: string;
  houseSlug: string;
  houseName: string;
};

export type FileRef = {
  fieldKey: string;
  bucket: string;
  path: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type ExecResult = {
  data?: unknown;

  history: {
    entityType: string;
    entityId: string;
    action: string;
    description: string;
    beforeSnapshot?: unknown;
    afterSnapshot?: unknown;
    metadata?: Record<string, unknown>;
  };

  filesToTrack?: FileRef[];

  filesToDelete?: {
    entityType: string;
    entityId: string;
    fieldKeys?: string[];
  }[];

  tasks?: {
    ensure?: {
      entityType: string;
      entityId: string;
      title: string;
    };
    complete?: {
      entityType: string;
      entityId: string;
    };
    delete?: {
      entityType: string;
      entityId: string;
    };
  };

  extraRevalidatePaths?: string[];
};
