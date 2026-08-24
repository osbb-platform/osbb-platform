export type ServerRateLimitPolicy = {
  scope: string;
  windowSeconds: number;
  maxAttempts: number;
};

export const rateLimitPolicies = {
  residentVoteInit: {
    scope: "resident_vote_init",
    windowSeconds: 60,
    maxAttempts: 5,
  },
  pollSubmit: {
    scope: "poll_submit",
    windowSeconds: 60,
    maxAttempts: 5,
  },
  chairmanPublish: {
    scope: "chairman_publish",
    windowSeconds: 60 * 60,
    maxAttempts: 5,
  },
  diiaCallback: {
    scope: "diia_callback",
    windowSeconds: 60,
    maxAttempts: 30,
  },
} as const satisfies Record<string, ServerRateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof rateLimitPolicies;
