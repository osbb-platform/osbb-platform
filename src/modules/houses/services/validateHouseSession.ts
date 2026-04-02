import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type ValidateHouseSessionParams = {
  slug: string;
  sessionToken: string;
};

export async function validateHouseSession({
  slug,
  sessionToken,
}: ValidateHouseSessionParams): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("is_house_session_valid", {
    target_house_slug: slug,
    target_session_token: sessionToken,
  });

  if (error) {
    throw new Error(`Failed to validate house session: ${error.message}`);
  }

  return Boolean(data);
}
