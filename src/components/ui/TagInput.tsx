'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Tag {
  id?: string;
  name: string;
  displayName: string;
}

interface TagInputProps {
  value: string[]; // Array of displayName values
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  disabled,
  placeholder = 'Add tags...',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions as user types
  useEffect(() => {
    if (inputValue.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `/api/tags?q=${encodeURIComponent(inputValue)}`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out already selected tags
          const filtered = data.filter(
            (tag: Tag) =>
              !value.some((v) => v.toLowerCase() === tag.name.toLowerCase())
          );
          setSuggestions(filtered);
          setSelectedIndex(-1);
        }
      } catch {
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [inputValue, value]);

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;

    // Check for duplicates (case-insensitive)
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;

    onChange([...value, trimmed]);
    setInputValue('');
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        addTag(suggestions[selectedIndex].displayName);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg bg-white min-h-[42px]',
          disabled && 'bg-gray-50 opacity-60'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-sm rounded-full"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="hover:text-blue-600"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((tag, index) => (
            <button
              key={tag.id || tag.name}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-100',
                index === selectedIndex && 'bg-gray-100'
              )}
              onMouseDown={() => addTag(tag.displayName)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {tag.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
