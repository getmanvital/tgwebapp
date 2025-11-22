type Props = {
  query: string;
  size: string;
  sizes: string[];
  onQueryChange: (value: string) => void;
  onSizeChange: (value: string) => void;
};

const FiltersBar = ({ query, size, sizes, onQueryChange, onSizeChange }: Props) => {
  return (
    <section className="filters-bar">
      <input
        type="search"
        placeholder="Поиск по названию"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      <select value={size} onChange={(event) => onSizeChange(event.target.value)}>
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














