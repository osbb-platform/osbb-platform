// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PublicThemeScript.tsx
// Блок 0 — анти-FOUC. Серверний компонент: інлайнить синхронний скрипт,
// який ДО першого кадру читає localStorage["osbb-house-theme-<slug>"] і
// виставляє data-house-theme на #pub-theme-root.
//
// Рендериться ПЕРШИМ дочірнім вузлом кореня .pub-theme-root у layout.tsx —
// на момент виконання елемент #pub-theme-root уже розпарсений у DOM.
// ════════════════════════════════════════════════════════════════════════
import * as React from "react";

export function PublicThemeScript({ slug }: { slug: string }) {
  // slug потрапляє в рядок як JSON-літерал → безпечно від лапок/спецсимволів.
  const js = `(function(){try{` +
    `var k="osbb-house-theme-"+${JSON.stringify(slug)};` +
    `var t=localStorage.getItem(k);` +
    `if(t!=="light"&&t!=="dark")t="light";` +
    `var el=document.getElementById("pub-theme-root");` +
    `if(el)el.setAttribute("data-house-theme",t);` +
    `}catch(e){}})();`;

  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: js }} />;
}
