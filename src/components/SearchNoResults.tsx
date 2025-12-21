interface SearchNoResultsProps {
  query: string;
  onClear: () => void;
}

export function SearchNoResults({ query, onClear }: SearchNoResultsProps) {
  return (
    <div className="text-center py-12">
      <div className="mb-4">
        <svg
          className="w-12 h-12 mx-auto text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
      <p className="text-gray-500 mb-4">
        No lessons match &quot;{query}&quot;
      </p>
      <button
        onClick={onClear}
        className="text-blue-500 hover:text-blue-600 text-sm font-medium"
      >
        Clear search
      </button>
    </div>
  );
}
