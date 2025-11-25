type Props = {
  query: string;
  size: string;
  sizes: string[];
  onQueryChange: (value: string) => void;
  onSizeChange: (value: string) => void;
};

const FiltersBar = ({ query, size, sizes, onQueryChange, onSizeChange }: Props) => {
  return (
    <section className="flex gap-2">
      <input
        type="search"
        placeholder="Поиск по названию"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="flex-1 px-2.5 py-2.5 rounded-xl border border-black/10 bg-tg-secondary-bg text-tg-text transition-colors dark:border-white/20"
      />

      <select 
        value={size} 
        onChange={(event) => onSizeChange(event.target.value)}
        className="flex-1 px-2.5 py-2.5 rounded-xl border border-black/10 bg-tg-secondary-bg text-tg-text transition-colors dark:border-white/20"
      >
        <option value="">Все размеры</option>
        {sizes.map((sizeOption) => (
          <option key={sizeOption} value={sizeOption}>
            {sizeOption}
          </option>
        ))}
      </select>
    </section>
  );
};

export default FiltersBar;



















