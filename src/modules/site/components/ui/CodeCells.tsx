type CodeCellsProps = {
  code: string;
};

export function CodeCells({ code }: CodeCellsProps) {
  const characters = code.padEnd(6, " ").slice(0, 6).split("");

  return (
    <div aria-label={`Код доступу: ${code}`} className="osbb-code">
      {characters.map((character, index) => (
        <span aria-hidden="true" key={`${character}-${index}`}>
          {character.trim() || "•"}
        </span>
      ))}
    </div>
  );
}
