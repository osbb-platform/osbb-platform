"use client";

import { useId, useState } from "react";

export type AccordionItem = {
  id: string;
  title: string;
  content: string;
};

type AccordionProps = {
  items: readonly AccordionItem[];
};

export function Accordion({ items }: AccordionProps) {
  const instanceId = useId();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="osbb-accordion">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const triggerId = `${instanceId}-${item.id}-trigger`;
        const panelId = `${instanceId}-${item.id}-panel`;

        return (
          <div className="osbb-accordion__item" key={item.id}>
            <h3>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="osbb-accordion__trigger"
                id={triggerId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                type="button"
              >
                <span>{item.title}</span>
                <span aria-hidden="true" className="osbb-accordion__icon">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>

            <div
              aria-labelledby={triggerId}
              className="osbb-accordion__panel"
              hidden={!isOpen}
              id={panelId}
              role="region"
            >
              <p>{item.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
