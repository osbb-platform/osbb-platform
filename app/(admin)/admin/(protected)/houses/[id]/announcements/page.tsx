import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { redirect } from "next/navigation";

type AdminHouseAnnouncementsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminHouseAnnouncementsPage({
  params,
}: AdminHouseAnnouncementsPageProps) {
  const { id } = await params;

  redirect(`${ROUTES.admin.houses}/${id}?block=announcements`);
}
