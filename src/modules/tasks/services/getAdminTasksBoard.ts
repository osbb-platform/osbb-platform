import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { AdminTaskBoardItem } from "@/src/modules/tasks/types/tasks.types";

export async function getAdminTasksBoard(): Promise<AdminTaskBoardItem[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: tasks, error } = await supabase
      .from("platform_tasks")
      .select(`
        id,
        title,
        description,
        status,
        task_type,
        priority,
        created_at,
        updated_at,
        deadline_at,
        completed_at,
        archived_at,
        created_by,
        assigned_to,
        is_overdue
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load platform tasks:", error.message);
      return [];
    }

    const rows = tasks ?? [];
    const taskIds = rows.map((item) => item.id);

    const [{ data: comments }, { data: events }, { data: taskHouses }] =
      await Promise.all([
        taskIds.length
          ? supabase
              .from("platform_task_comments")
              .select("id, task_id, author_id, content, created_at")
              .in("task_id", taskIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] }),
        taskIds.length
          ? supabase
              .from("platform_task_events")
              .select("id, task_id, actor_id, action_label, before_value, after_value, created_at")
              .in("task_id", taskIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] }),
        taskIds.length
          ? supabase
              .from("platform_task_houses")
              .select("task_id, house_id, house:houses(id, name)")
              .in("task_id", taskIds)
          : Promise.resolve({ data: [] }),
      ]);

    const profileIds = Array.from(
      new Set(
        [
          ...rows.flatMap((item) => [item.created_by, item.assigned_to]),
          ...((comments ?? []) as Array<{ author_id?: string | null }>).map(
            (item) => item.author_id,
          ),
          ...((events ?? []) as Array<{ actor_id?: string | null }>).map(
            (item) => item.actor_id,
          ),
        ].filter(Boolean),
      ),
    ) as string[];

    let profilesMap = new Map<string, string>();

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);

      profilesMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile.full_name ?? profile.email ?? "Без імені",
        ]),
      );
    }

    const commentsMap = new Map<string, AdminTaskBoardItem["comments"]>();
    for (const comment of (comments ?? []) as Array<{
      id: string;
      task_id: string;
      author_id: string | null;
      content: string;
      created_at: string | null;
    }>) {
      const bucket = commentsMap.get(comment.task_id) ?? [];
      bucket.push({
        id: comment.id,
        authorName: comment.author_id
          ? profilesMap.get(comment.author_id) ?? null
          : null,
        content: comment.content,
        createdAt: comment.created_at,
      });
      commentsMap.set(comment.task_id, bucket);
    }

    const eventsMap = new Map<string, AdminTaskBoardItem["events"]>();
    for (const event of (events ?? []) as Array<{
      id: string;
      task_id: string;
      actor_id: string | null;
      action_label: string;
      before_value: string | null;
      after_value: string | null;
      created_at: string | null;
    }>) {
      const bucket = eventsMap.get(event.task_id) ?? [];
      bucket.push({
        id: event.id,
        actorName: event.actor_id ? profilesMap.get(event.actor_id) ?? null : null,
        actionLabel: event.action_label,
        beforeValue: event.before_value,
        afterValue: event.after_value,
        createdAt: event.created_at,
      });
      eventsMap.set(event.task_id, bucket);
    }

    const housesMap = new Map<
      string,
      Array<{
        id: string;
        name: string;
      }>
    >();

    for (const relation of (taskHouses ?? []) as unknown as Array<{
      task_id: string;
      house?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
    }>) {
      const house = Array.isArray(relation.house)
        ? relation.house[0]
        : relation.house;

      if (!house) continue;

      const bucket = housesMap.get(relation.task_id) ?? [];
      bucket.push({
        id: house.id,
        name: house.name,
      });
      housesMap.set(relation.task_id, bucket);
    }

    return rows.map((item) => {
      const houses = housesMap.get(item.id) ?? [];

      return {
        id: item.id,
        title: item.title,
        description: item.description ?? null,

        status: item.status,
        taskType: item.task_type,
        priority: item.priority ?? null,

        createdAt: item.created_at ?? null,
        updatedAt: item.updated_at ?? null,
        deadlineAt: item.deadline_at ?? null,
        completedAt: item.completed_at ?? null,
        archivedAt: item.archived_at ?? null,

        assignedToId: item.assigned_to ?? null,
        assignedToName: item.assigned_to
          ? profilesMap.get(item.assigned_to) ?? null
          : null,

        createdById: item.created_by ?? null,
        createdByName: item.created_by
          ? profilesMap.get(item.created_by) ?? null
          : null,

        housesCount: houses.length,
        primaryHouseId: houses[0]?.id ?? null,
        primaryHouseLabel: houses[0]?.name ?? null,

        isOverdue: Boolean(item.is_overdue),

        comments: commentsMap.get(item.id) ?? [],
        events: eventsMap.get(item.id) ?? [],
      };
    });
  } catch (error) {
    console.error("getAdminTasksBoard crash:", error);
    return [];
  }
}
