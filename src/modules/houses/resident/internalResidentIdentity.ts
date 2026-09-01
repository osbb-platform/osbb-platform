import { createHmac } from "node:crypto";

export function internalResidentIdentityHmac(params: {
  houseId: string;
  meetingId: string;
  sessionToken: string;
  secret: string;
}): string {
  return createHmac("sha256", params.secret)
    .update("osbb:p06:internal-resident:v2")
    .update("\0")
    .update(params.houseId)
    .update("\0")
    .update(params.meetingId)
    .update("\0")
    .update(params.sessionToken)
    .digest("hex");
}
