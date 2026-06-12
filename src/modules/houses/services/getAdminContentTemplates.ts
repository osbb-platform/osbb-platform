import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import {
  getContentTemplates,
  type TemplateSectionKind,
} from "@/src/modules/content-engine/v2/services/templateService";
import type { ContentTemplateSlot } from "@/src/modules/houses/components/ContentTemplateSlotsPanel";

export async function getAdminContentTemplates(params: {
  sectionKind: TemplateSectionKind;
}): Promise<ContentTemplateSlot[]> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const result = await getContentTemplates<Record<string, unknown>>(supabase, {
    sectionKind: params.sectionKind,
  });

  if (!result.ok) {
    console.error("Failed to load content templates:", result.error);
    return [];
  }

  return result.data.map((template) => ({
    id: template.id,
    sectionKind: template.sectionKind,
    templateKey: template.templateKey,
    slotIndex: template.slotIndex,
    name: template.name,
    title: template.title,
    description: template.description,
    payload: template.payload,
    sortOrder: template.sortOrder,
  }));
}
