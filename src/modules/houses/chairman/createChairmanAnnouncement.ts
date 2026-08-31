"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { createSupabaseAdminClient } from "../../../integrations/supabase/server/admin";
import {
  assertChairmanContext,
  CHAIRMAN_ACTOR_NAME,
  CHAIRMAN_ACTOR_ROLE,
  CHAIRMAN_SOURCE,
} from "@/src/modules/houses/chairman/guard";

const TITLE_MAX_LENGTH = 160;
const BODY_MAX_LENGTH = 5000;
const ALLOWED_LEVELS = ["info", "warning", "danger"] as const;

type AnnouncementLevel = (typeof ALLOWED_LEVELS)[number];

export type CreateChairmanAnnouncementInput = {
  slug: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
};

export type CreateChairmanAnnouncementResult =
  | {
      ok: true;
      announcementId: string;
    }
  | {
      ok: false;
      error: string;
    };

function normalizeInput(
  input: CreateChairmanAnnouncementInput,
):
  | {
      ok: true;
      data: {
        slug: string;
        title: string;
        body: string;
        level: AnnouncementLevel;
      };
    }
  | {
      ok: false;
      error: string;
    } {
  const slug = input.slug?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const level = input.level;

  if (!slug) {
    return { ok: false, error: "Будинок не визначено." };
  }

  if (!title) {
    return { ok: false, error: "Вкажіть заголовок оголошення." };
  }

  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Заголовок має містити не більше ${TITLE_MAX_LENGTH} символів.`,
    };
  }

  if (!body) {
    return { ok: false, error: "Вкажіть текст оголошення." };
  }

  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `Текст має містити не більше ${BODY_MAX_LENGTH} символів.`,
    };
  }

  if (!ALLOWED_LEVELS.includes(level)) {
    return { ok: false, error: "Оберіть коректний рівень оголошення." };
  }

  return {
    ok: true,
    data: {
      slug,
      title,
      body,
      level,
    },
  };
}

export async function createChairmanAnnouncement(
  input: CreateChairmanAnnouncementInput,
): Promise<CreateChairmanAnnouncementResult> {
  const normalized = normalizeInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    return await assertChairmanContext(
      { slug: normalized.data.slug },
      async (context) => {
        const supabase = await createSupabaseServerClient();
        const now = new Date().toISOString();

        const { data: announcement, error: announcementError } = await supabase
          .from("house_announcements")
          .insert({
            house_id: context.houseId,
            title: normalized.data.title,
            body: normalized.data.body,
            level: normalized.data.level,
            lifecycle_status: "published",
            published_at: now,
            created_by: null,
          })
          .select("id, house_id, title, body, level, lifecycle_status, published_at")
          .single();

        if (announcementError || !announcement) {
          console.error("Chairman announcement insert failed", {
            houseId: context.houseId,
            slug: context.slug,
            code: announcementError?.code ?? null,
          });
          return {
            ok: false,
            error: "Не вдалося опублікувати оголошення. Спробуйте ще раз.",
          };
        }

        const { error: historyError } = await supabase
          .from("house_content_history")
          .insert({
            house_id: context.houseId,
            entity_type: "house_announcement",
            entity_id: announcement.id,
            action: "published",
            actor_admin_id: null,
            actor_name: CHAIRMAN_ACTOR_NAME,
            actor_email: null,
            actor_role: CHAIRMAN_ACTOR_ROLE,
            before_snapshot: null,
            after_snapshot: announcement,
            metadata: {
              source: CHAIRMAN_SOURCE,
              slug: context.slug,
            },
          });

        if (historyError) {
          console.error("Chairman announcement history insert failed", {
            houseId: context.houseId,
            announcementId: announcement.id,
            code: historyError.code ?? null,
          });
        }

        try {
          const taskSupabase = createSupabaseAdminClient();
          const { error: taskError } = await taskSupabase.rpc(
            "create_house_scoped_platform_task",
            {
              p_house_id: context.houseId,
              p_task_type: "system",
              p_title: "Перевірити оголошення голови",
              p_description: `Голова ОСББ опублікував оголошення «${announcement.title}».`,
              p_priority: "medium",
              p_assigned_to: null,
              p_deadline_at: null,
              p_link_type: "system_event",
              p_entity_type: "house_announcement",
              p_entity_id: announcement.id,
              p_created_by: null,
              p_is_manual: false,
            },
          );

          if (taskError) {
            console.error("Chairman announcement manager task insert failed", {
              houseId: context.houseId,
              announcementId: announcement.id,
              code: taskError.code ?? null,
            });
          }

        } catch (taskError) {
          console.error("Chairman announcement manager task side effect failed", {
            houseId: context.houseId,
            announcementId: announcement.id,
            error:
              taskError instanceof Error
                ? taskError.message
                : "Unknown manager task error",
          });
        }

        revalidatePath(`/house/${context.slug}/announcements`);
        revalidatePath(`/house/${context.slug}`);

        return {
          ok: true,
          announcementId: announcement.id,
        };
      },
    );
  } catch (error) {
    console.error("Chairman announcement action rejected", {
      slug: normalized.data.slug,
      error,
    });

    return {
      ok: false,
      error: "Не вдалося опублікувати оголошення. Перевірте доступ і спробуйте ще раз.",
    };
  }
}
