import { notFound } from "next/navigation";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import {
  getPublicHouseFoundingDocuments,
  type PublicHouseFoundingDocumentItem,
} from "@/src/modules/houses/services/getPublicHouseFoundingDocuments";
import type { HouseDocumentType } from "@/src/modules/houses/services/getHouseDocuments";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";

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

  const typeTabs: PubFilterTabItem[] = documentTypesWithContent.map((type) => ({
    key: type,
    label: DOCUMENT_TYPE_LABELS[type],
    href: `/founding-documents?type=${type}`,
    count: documents.filter((document) => getDocumentType(document) === type).length,
    active: selectedType === type,
  }));

  return (
    <div className="grid min-w-0 gap-6">
      <PubSectionHeader
        title="Установчі документи"
        description="Статут, реєстраційні матеріали, протоколи та інші ключові документи будинку в одному місці."
      >
        {typeTabs.length > 0 ? (
          <PubFilterTabs items={typeTabs} ariaLabel="Тип документа" />
        ) : null}
      </PubSectionHeader>

      <section>
        {documents.length === 0 ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
            Установчі документи поки не опубліковані.
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
            Документи цього типу поки не опубліковані.
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredDocuments.map((document) => (
              <article
                key={document.id}
                className="flex w-full min-w-0 flex-col rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] transition hover:shadow-[var(--pub-shadow-md)]"
              >
                <div className="flex flex-wrap gap-2">
                  <PubBadge tone="neutral" size="sm">
                    {DOCUMENT_TYPE_LABELS[getDocumentType(document)]}
                  </PubBadge>
                </div>

                <div className="mt-4 break-words text-base font-semibold text-[var(--pub-text)] sm:text-lg">
                  {document.title}
                </div>

                <p className="mt-3 break-words text-sm leading-7 text-[var(--pub-text-muted)]">
                  {document.description || "PDF документ доступний для перегляду."}
                </p>

                <PublicReportPdfViewer
                  filePath={document.storage_path ?? ""}
                  fileName={document.original_file_name || document.title}
                  bucket="house-documents"
                  analyticsHouseId={house.id}
                  analyticsHouseSlug={house.slug}
                  analyticsEntityId={document.id}
                  analyticsDocumentType={getDocumentType(document)}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
