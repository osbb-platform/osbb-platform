const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  ґ: "g",
  д: "d",
  е: "e",
  ё: "e",
  є: "ye",
  ж: "zh",
  з: "z",
  и: "i",
  і: "i",
  ї: "yi",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function normalizeCyrillicHomoglyphs(value: string) {
  return value
    // Latin p/P inside Cyrillic text is visually identical to Ukrainian/ Cyrillic р/Р.
    // Example: "Чаpівна" -> "Чарівна", so slug becomes charivna, not chapivna.
    .replace(/([\u0400-\u04FF])p(?=[\u0400-\u04FF])/g, "$1р")
    .replace(/([\u0400-\u04FF])P(?=[\u0400-\u04FF])/g, "$1Р");
}

function transliterate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split("")
    .map((symbol) => CYRILLIC_TO_LATIN_MAP[symbol] ?? symbol)
    .join("");
}

export function slugify(value: string) {
  return transliterate(normalizeCyrillicHomoglyphs(value))
    .replace(/['’`"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
