import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import {
  getPublicHouseFoundingDocuments,
  type PublicHouseFoundingDocumentItem,
} from "@/src/modules/houses/services/getPublicHouseFoundingDocuments";
import type { HouseDocumentType } from "@/src/modules/houses/services/getHouseDocuments";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    type?: string;
  }>;
};

const DOCUMENT_TYPE_LABELS: Record<HouseDocumentType, string> = {
  statute: "Статут",
  extract: "Виписка",
  protocol: "Протокол",
  registration: "Реєстраційні документи",
  contracts: "Договори",
  other: "Інше",
};

const DOCUMENT_TYPE_ORDER: HouseDocumentType[] = [
  "statute",
  "extract",
  "protocol",
  "registration",
  "contracts",
  "other",
];

function getDocumentType(document: PublicHouseFoundingDocumentItem) {
  return document.document_type ?? "other";
}

function formatDate(value: string | null) {
  if (!value) return "Дату не вказано";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Дату не вказано";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function FoundingDocumentsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const districtColor = house.district?.theme_color ?? "#16a34a";
  const documents = await getPublicHouseFoundingDocuments(house.id);

  const documentTypesWithContent = DOCUMENT_TYPE_ORDER.filter((type) =>
    documents.some((document) => getDocumentType(document) === type),
  );

  const selectedType =
    resolvedSearchParams.type &&
    documentTypesWithContent.includes(resolvedSearchParams.type as HouseDocumentType)
      ? (resolvedSearchParams.type as HouseDocumentType)
      : (documentTypesWithContent[0] ?? null);

  const filteredDocuments = selectedType
    ? documents.filter((document) => getDocumentType(document) === selectedType)
    : [];

  return (
    <section className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid min-w-0 gap-6">
        <section className="w-full min-w-0 rounded-[36px] border border-[#E4DBD1] bg-[#F3EEE8] p-6 text-center shadow-[0_4px_16px_rgba(0,0,0,0.04)] sm:p-8 lg:p-10">
          <h1 className="text-4xl font-semibold tracking-tight text-[#1F2A37] sm:text-5xl lg:text-6xl">
            Установчі документи
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#5B6B7C] sm:text-lg">
            Статут, реєстраційні матеріали, протоколи та інші ключові документи будинку в одному місці.
          </p>

          {documentTypesWithContent.length > 0 ? (
            <div className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-3 shadow-sm backdrop-blur-sm">
              <div className="flex w-full min-w-0 justify-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
                {documentTypesWithContent.map((type) => {
                  const isActive = selectedType === type;
                  const count = documents.filter(
                    (document) => getDocumentType(document) === type,
                  ).length;

                  return (
                    <Link
                      key={type}
                      href={`/house/${slug}/founding-documents?type=${type}`}
                      className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                          : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                      }`}
                      style={
                        isActive
                          ? ({
                              "--tab-active-bg": `${districtColor}20`,
                              "--tab-active-text": "#1F2A37",
                              borderColor: districtColor,
                            } as CSSProperties)
                          : undefined
                      }
                    >
                      <span>{DOCUMENT_TYPE_LABELS[type]}</span>
                      <span
                        className={`inline-flex min-w-[22px] items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          isActive
                            ? "border-[#C4B7A7] bg-[#D9CFC3] text-[#1F2A44]"
                            : "border-[#D2C6B8] bg-[#E7DED3] text-[#2F3A4F]"
                        }`}
                      >
                        {count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <section>
          {documents.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#E2D8CC] bg-[var(--card)] p-4 text-sm text-[var(--muted)] sm:rounded-[32px] sm:p-6">
              Установчі документи поки не опубліковані.
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#E2D8CC] bg-[var(--card)] p-4 text-sm text-[var(--muted)] sm:rounded-[32px] sm:p-6">
              Документи цього типу поки не опубліковані.
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredDocuments.map((document) => (
                <article
                  key={document.id}
                  className="w-full min-w-0 rounded-[22px] border border-[#E2D8CC] bg-[#F9F6F2] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#D2C6B8] bg-[#E7DED3] px-3 py-1 text-xs font-medium text-[#2F3A4F]">
                      {DOCUMENT_TYPE_LABELS[getDocumentType(document)]}
                    </span>
                  </div>

                  <div className="mt-4 break-words text-base font-semibold text-[#1F2A37] sm:text-lg">
                    {document.title}
                  </div>

                  <p className="mt-3 break-words text-sm leading-7 text-[#5B6B7C]">
                    {document.description || "PDF документ доступний для перегляду."}
                  </p>

                  <div className="mt-4 text-sm text-[#5F5A54]">
                    {formatDate(document.updated_at || document.created_at)}
                  </div>

                  <PublicReportPdfViewer
                    filePath={document.storage_path ?? ""}
                    fileName={document.original_file_name || document.title}
                    bucket="house-documents"
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
