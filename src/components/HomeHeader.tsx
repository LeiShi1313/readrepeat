import Link from 'next/link';

interface HomeHeaderProps {
  appName: string;
  headerTextClass: string;
}

export function HomeHeader({ appName, headerTextClass }: HomeHeaderProps) {
  return (
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
  );
}
