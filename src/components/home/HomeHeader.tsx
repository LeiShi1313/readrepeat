import Link from 'next/link';
import { SearchIcon } from '@/components/ui/icons';

interface HomeHeaderProps {
  appName: string;
  headerTextClass: string;
  showSearchIcon?: boolean;
  isSearchOpen?: boolean;
  onSearchClick?: () => void;
}

export function HomeHeader({
  appName,
  headerTextClass,
  showSearchIcon = false,
  isSearchOpen = false,
  onSearchClick,
}: HomeHeaderProps) {
  return (
    <header className="bg-white border-b">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className={`text-xl font-bold ${headerTextClass}`}>{appName}</h1>
        <div className="flex items-center gap-2">
          {showSearchIcon && (
            <button
              onClick={onSearchClick}
              className={`p-2 rounded-lg transition-colors ${
                isSearchOpen
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={isSearchOpen ? 'Close search' : 'Search lessons'}
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          )}
          <Link
            href="/create-lesson"
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            New Lesson
          </Link>
        </div>
      </div>
    </header>
  );
}
