import "server-only";

import {
  withResidentSession,
  type ResidentSessionContext,
} from "@/src/modules/houses/resident/withResidentSession";
import { rateLimitPolicies } from "@/src/shared/security/rateLimitPolicies";

export const CHAIRMAN_ACTOR_NAME = "Голова ОСББ";
export const CHAIRMAN_ACTOR_ROLE = "chairman";
export const CHAIRMAN_SOURCE = "chairman_cabinet";

export type ChairmanContext = ResidentSessionContext & {
  actorName: typeof CHAIRMAN_ACTOR_NAME;
  actorRole: typeof CHAIRMAN_ACTOR_ROLE;
  source: typeof CHAIRMAN_SOURCE;
};

/**
 * Security boundary for P08 chairman writes.
 *
 * v1 deliberately reuses the valid house session as the chairman factor.
 * A future dedicated chairman factor must be added here so chairman actions
 * do not need to change their authorization contract.
 *
 * withResidentSession already enforces:
 * - same-origin request;
 * - valid house-session cookie for the route slug;
 * - server-side house lookup;
 * - the supplied server rate-limit policy.
 */
export async function assertChairmanContext<T>(
  params: {
    slug: string;
  },
  operation: (context: ChairmanContext) => Promise<T>,
): Promise<T> {
  return withResidentSession(
    {
      slug: params.slug,
      rateLimitPolicy: rateLimitPolicies.chairmanPublish,
    },
    async (residentContext) =>
      operation({
        ...residentContext,
        actorName: CHAIRMAN_ACTOR_NAME,
        actorRole: CHAIRMAN_ACTOR_ROLE,
        source: CHAIRMAN_SOURCE,
      }),
  );
}
