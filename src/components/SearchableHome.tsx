'use client';

import Link from 'next/link';
import { LessonCard } from '@/components/LessonCard';
import { SearchBar } from '@/components/SearchBar';
import { useSearchLessons } from '@/hooks/useSearchLessons';
import type { LessonWithTags } from '@/lib/db/lessons';

interface SearchableHomeProps {
  initialLessons: LessonWithTags[];
  appName: string;
  headerTextClass: string;
}

export function SearchableHome({ initialLessons, appName, headerTextClass }: SearchableHomeProps) {
  const { query, setQuery, lessons, isSearching, clearSearch } = useSearchLessons({
    initialLessons,
  });

  const showNoResults = query.trim() && !isSearching && lessons.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className={`text-xl font-bold ${headerTextClass}`}>{appName}</h1>
          <Link
            href="/create-lesson"
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            New Lesson
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {initialLessons.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-6">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search by title, text, or tags..."
              />
            </div>

            {isSearching ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : showNoResults ? (
              <NoResults query={query} onClear={clearSearch} />
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="mb-6">
        <svg
          className="w-16 h-16 mx-auto text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No lessons yet</h2>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        Create your first shadow reading lesson by uploading foreign text, translation, and audio.
      </p>
      <Link
        href="/create-lesson"
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Your First Lesson
      </Link>
    </div>
  );
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
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
