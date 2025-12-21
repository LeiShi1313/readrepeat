import { SearchableHome } from '@/components/SearchableHome';
import { appConfig } from '@/lib/env';
import { getAllLessonsWithTags } from '@/lib/db/lessons';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const lessons = await getAllLessonsWithTags();

  return (
    <SearchableHome
      initialLessons={lessons}
      appName={appConfig.name}
      headerTextClass={appConfig.headerText}
    />
  );
}
