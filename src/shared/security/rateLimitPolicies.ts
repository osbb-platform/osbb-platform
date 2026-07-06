export type RateLimitPolicy = {
  scope: string;
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds: number;
};

export const RATE_LIMIT_POLICIES = {
  houseLogin: {
    scope: "house_login",
    maxAttempts: 3,
    windowSeconds: 5 * 60,
    blockSeconds: 5 * 60,
  },
  adminLogin: {
    scope: "admin_login",
    maxAttempts: 5,
    windowSeconds: 15 * 60,
    blockSeconds: 15 * 60,
  },
  analyticsIngest: {
    scope: "api_analytics",
    maxAttempts: 120,
    windowSeconds: 60,
    blockSeconds: 60,
  },
} as const satisfies Record<string, RateLimitPolicy>;
