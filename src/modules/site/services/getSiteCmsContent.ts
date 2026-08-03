import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  siteCities,
  sitePosts,
  siteReleases,
  siteSettings,
  siteTestimonials,
  type SiteCityContent,
  type SiteCityStatus,
  type SitePostContent,
  type SiteReleaseContent,
  type SiteReleaseStatus,
  type SiteSettingsContent,
  type SiteTestimonialContent,
} from "@/src/modules/site/data/siteContent";

export type SiteCmsContent = {
  settings: SiteSettingsContent;
  cities: readonly SiteCityContent[];
  testimonials: readonly SiteTestimonialContent[];
  posts: readonly SitePostContent[];
  releases: readonly SiteReleaseContent[];
};

type SiteSettingsRow = {
  organization_name: string | null;
  legal_name: string | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  telegram_url: string | null;
  telegram_handle: string | null;
  whatsapp_url: string | null;
  office_address: string | null;
  working_hours: string | null;
  partner_name: string | null;
  partner_city: string | null;
  partner_experience: string | null;
  demo_house_name: string | null;
  demo_house_address: string | null;
  demo_house_code: string | null;
  demo_house_url: string | null;
};

type SiteCityRow = {
  slug: string;
  name: string | null;
  name_locative: string | null;
  status: string | null;
  houses_count_override: number | null;
  map_x: number | string | null;
  map_y: number | string | null;
  sort_order: number | null;
};

type SiteTestimonialRow = {
  public_key: string;
  author_name: string | null;
  author_role: string | null;
  city: string | null;
  quote: string | null;
  sort_order: number | null;
};

type SiteCategoryRow = {
  id: string;
  name: string | null;
};

type SitePostRow = {
  slug: string;
  title: string | null;
  excerpt: string | null;
  category_id: string | null;
  published_at: string | null;
  featured: boolean | null;
  sort_order: number | null;
};

type SiteReleaseRow = {
  slug: string;
  title: string | null;
  summary: string | null;
  period_label: string | null;
  status: string | null;
  status_label: string | null;
  sort_order: number | null;
};

type QueryResult<T> = {
  data: T[] | T | null;
  error: {
    code?: string | null;
    message: string;
  } | null;
};

const SITE_CMS_REVALIDATE_SECONDS = 300;

const supportedCitySlugs = new Set<SiteCityContent["slug"]>([
  "zaporizhzhia",
  "kyiv",
  "odesa",
]);

function asText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

function asNullableText(value: unknown, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return asText(value, fallback);
}

function asNumber(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeCityStatus(
  value: unknown,
  fallback: SiteCityStatus,
): SiteCityStatus {
  return value === "live" || value === "opening" ? value : fallback;
}

function normalizeReleaseStatus(
  value: unknown,
  fallback: SiteReleaseStatus,
): SiteReleaseStatus {
  return value === "released" || value === "planned" ? value : fallback;
}

function formatPublishedLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  });
}

function logCmsReadFailure(
  resource: string,
  error: QueryResult<unknown>["error"],
) {
  if (!error) {
    return;
  }

  console.error("SITE_CMS_READ_FAILED", {
    resource,
    code: error.code ?? null,
    message: error.message,
  });
}

function mapSettings(row: SiteSettingsRow | null): SiteSettingsContent {
  if (!row) {
    return siteSettings;
  }

  return {
    organizationName: asText(
      row.organization_name,
      siteSettings.organizationName,
    ),
    legalName: asText(row.legal_name, siteSettings.legalName),
    primaryPhone: asText(row.primary_phone, siteSettings.primaryPhone),
    secondaryPhone: asNullableText(
      row.secondary_phone,
      siteSettings.secondaryPhone,
    ),
    email: asText(row.email, siteSettings.email),
    telegramUrl: asNullableText(row.telegram_url, siteSettings.telegramUrl),
    telegramHandle: asNullableText(
      row.telegram_handle,
      siteSettings.telegramHandle,
    ),
    whatsappUrl: asNullableText(row.whatsapp_url, siteSettings.whatsappUrl),
    officeAddress: asNullableText(
      row.office_address,
      siteSettings.officeAddress,
    ),
    workingHours: asNullableText(row.working_hours, siteSettings.workingHours),
    partnerName: asNullableText(row.partner_name, siteSettings.partnerName),
    partnerCity: asNullableText(row.partner_city, siteSettings.partnerCity),
    partnerExperience: asNullableText(
      row.partner_experience,
      siteSettings.partnerExperience,
    ),
    demoHouseName: asText(row.demo_house_name, siteSettings.demoHouseName),
    demoHouseAddress: asText(
      row.demo_house_address,
      siteSettings.demoHouseAddress,
    ),
    demoHouseCode: asText(row.demo_house_code, siteSettings.demoHouseCode),
    demoHouseUrl: asText(row.demo_house_url, siteSettings.demoHouseUrl),
  };
}

function mapCities(rows: SiteCityRow[]): SiteCityContent[] {
  const fallbackBySlug = new Map(siteCities.map((city) => [city.slug, city]));

  const mapped = rows
    .filter(
      (
        row,
      ): row is SiteCityRow & {
        slug: SiteCityContent["slug"];
      } => supportedCitySlugs.has(row.slug as SiteCityContent["slug"]),
    )
    .map((row) => {
      const fallback = fallbackBySlug.get(row.slug);

      if (!fallback) {
        return null;
      }

      return {
        slug: row.slug,
        name: asText(row.name, fallback.name),
        nameLocative: asText(row.name_locative, fallback.nameLocative),
        status: normalizeCityStatus(row.status, fallback.status),
        housesCount:
          row.houses_count_override === null
            ? fallback.housesCount
            : Math.max(
                Math.trunc(
                  asNumber(row.houses_count_override, fallback.housesCount),
                ),
                0,
              ),
        mapX: asNumber(row.map_x, fallback.mapX),
        mapY: asNumber(row.map_y, fallback.mapY),
      } satisfies SiteCityContent;
    })
    .filter((city): city is SiteCityContent => city !== null);

  return mapped.length > 0 ? mapped : [...siteCities];
}

function mapTestimonials(rows: SiteTestimonialRow[]): SiteTestimonialContent[] {
  const mapped = rows
    .map((row) => ({
      id: asText(row.public_key, ""),
      authorName: asText(row.author_name, ""),
      authorRole: asText(row.author_role, ""),
      city: asText(row.city, ""),
      quote: asText(row.quote, ""),
      sortOrder: asNumber(row.sort_order, 100),
    }))
    .filter(
      (item) =>
        item.id &&
        item.authorName &&
        item.authorRole &&
        item.city &&
        item.quote,
    );

  return mapped.length > 0 ? mapped : [...siteTestimonials];
}

function mapPosts(params: {
  rows: SitePostRow[];
  categories: SiteCategoryRow[];
}): SitePostContent[] {
  const categoriesById = new Map(
    params.categories.map((category) => [
      category.id,
      asText(category.name, ""),
    ]),
  );

  const mapped = params.rows
    .map((row) => {
      const publishedAt = asText(row.published_at, "");

      return {
        slug: asText(row.slug, ""),
        title: asText(row.title, ""),
        excerpt: asText(row.excerpt, ""),
        category:
          (row.category_id ? categoriesById.get(row.category_id) : null) ||
          "Матеріали",
        publishedAt,
        publishedLabel: publishedAt ? formatPublishedLabel(publishedAt) : "",
        featured: Boolean(row.featured),
        sortOrder: asNumber(row.sort_order, 100),
      };
    })
    .filter(
      (post) => post.slug && post.title && post.excerpt && post.publishedAt,
    );

  return mapped.length > 0 ? mapped : [...sitePosts];
}

function mapReleases(rows: SiteReleaseRow[]): SiteReleaseContent[] {
  const fallbackBySlug = new Map(
    siteReleases.map((release) => [release.slug, release]),
  );

  const mapped = rows
    .map((row) => {
      const fallback = fallbackBySlug.get(row.slug);

      const status = normalizeReleaseStatus(
        row.status,
        fallback?.status ?? "planned",
      );

      return {
        slug: asText(row.slug, ""),
        title: asText(row.title, fallback?.title ?? ""),
        summary: asText(row.summary, fallback?.summary ?? ""),
        periodLabel: asText(row.period_label, fallback?.periodLabel ?? ""),
        status,
        statusLabel: asText(
          row.status_label,
          fallback?.statusLabel ??
            (status === "released" ? "Випущено" : "Заплановано"),
        ),
        sortOrder: asNumber(row.sort_order, fallback?.sortOrder ?? 100),
      };
    })
    .filter(
      (release) =>
        release.slug && release.title && release.summary && release.periodLabel,
    );

  return mapped.length > 0 ? mapped : [...siteReleases];
}

async function loadSiteCmsContent(): Promise<SiteCmsContent> {
  try {
    const supabase = createSupabasePublicClient();
    const now = new Date().toISOString();

    const [
      settingsResult,
      citiesResult,
      testimonialsResult,
      categoriesResult,
      postsResult,
      releasesResult,
    ] = await Promise.all([
      supabase
        .from("site_settings")
        .select(
          [
            "organization_name",
            "legal_name",
            "primary_phone",
            "secondary_phone",
            "email",
            "telegram_url",
            "telegram_handle",
            "whatsapp_url",
            "office_address",
            "working_hours",
            "partner_name",
            "partner_city",
            "partner_experience",
            "demo_house_name",
            "demo_house_address",
            "demo_house_code",
            "demo_house_url",
          ].join(", "),
        )
        .eq("singleton_key", "primary")
        .maybeSingle(),

      supabase
        .from("site_cities")
        .select(
          [
            "slug",
            "name",
            "name_locative",
            "status",
            "houses_count_override",
            "map_x",
            "map_y",
            "sort_order",
          ].join(", "),
        )
        .eq("is_visible", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("site_testimonials")
        .select(
          [
            "public_key",
            "author_name",
            "author_role",
            "city",
            "quote",
            "sort_order",
          ].join(", "),
        )
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),

      supabase
        .from("site_post_categories")
        .select("id, name")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }),

      supabase
        .from("site_posts")
        .select(
          [
            "slug",
            "title",
            "excerpt",
            "category_id",
            "published_at",
            "featured",
            "sort_order",
          ].join(", "),
        )
        .eq("status", "published")
        .not("published_at", "is", null)
        .lte("published_at", now)
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false }),

      supabase
        .from("site_releases")
        .select(
          [
            "slug",
            "title",
            "summary",
            "period_label",
            "status",
            "status_label",
            "sort_order",
          ].join(", "),
        )
        .eq("is_visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    logCmsReadFailure("site_settings", settingsResult.error);
    logCmsReadFailure("site_cities", citiesResult.error);
    logCmsReadFailure("site_testimonials", testimonialsResult.error);
    logCmsReadFailure("site_post_categories", categoriesResult.error);
    logCmsReadFailure("site_posts", postsResult.error);
    logCmsReadFailure("site_releases", releasesResult.error);

    const settingsRow =
      settingsResult.error || !settingsResult.data
        ? null
        : (settingsResult.data as unknown as SiteSettingsRow);

    const cityRows =
      citiesResult.error || !Array.isArray(citiesResult.data)
        ? []
        : (citiesResult.data as unknown as SiteCityRow[]);

    const testimonialRows =
      testimonialsResult.error || !Array.isArray(testimonialsResult.data)
        ? []
        : (testimonialsResult.data as unknown as SiteTestimonialRow[]);

    const categoryRows =
      categoriesResult.error || !Array.isArray(categoriesResult.data)
        ? []
        : (categoriesResult.data as unknown as SiteCategoryRow[]);

    const postRows =
      postsResult.error || !Array.isArray(postsResult.data)
        ? []
        : (postsResult.data as unknown as SitePostRow[]);

    const releaseRows =
      releasesResult.error || !Array.isArray(releasesResult.data)
        ? []
        : (releasesResult.data as unknown as SiteReleaseRow[]);

    return {
      settings: mapSettings(settingsRow),
      cities: mapCities(cityRows),
      testimonials: mapTestimonials(testimonialRows),
      posts: mapPosts({
        rows: postRows,
        categories: categoryRows,
      }),
      releases: mapReleases(releaseRows),
    };
  } catch (error) {
    console.error("SITE_CMS_INITIALIZATION_FAILED", error);

    return {
      settings: siteSettings,
      cities: [...siteCities],
      testimonials: [...siteTestimonials],
      posts: [...sitePosts],
      releases: [...siteReleases],
    };
  }
}

export const getSiteCmsContent = cache(async (): Promise<SiteCmsContent> =>
  unstable_cache(loadSiteCmsContent, ["site-cms-content-v1"], {
    tags: [
      "site:content",
      "site:settings",
      "site:cities",
      "site:testimonials",
      "site:posts",
      "site:releases",
    ],
    revalidate: SITE_CMS_REVALIDATE_SECONDS,
  })(),
);
