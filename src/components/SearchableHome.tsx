'use client';

import { HomeHeader } from '@/components/HomeHeader';
import { SearchBar } from '@/components/SearchBar';
import { LessonList } from '@/components/LessonList';
import { EmptyLessonsState } from '@/components/EmptyLessonsState';
import { SearchNoResults } from '@/components/SearchNoResults';
import { SearchLoading } from '@/components/SearchLoading';
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
      <HomeHeader appName={appName} headerTextClass={headerTextClass} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {initialLessons.length === 0 ? (
          <EmptyLessonsState />
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
              <SearchLoading />
            ) : showNoResults ? (
              <SearchNoResults query={query} onClear={clearSearch} />
            ) : (
              <LessonList lessons={lessons} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
