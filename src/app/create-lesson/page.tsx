import { UploadForm } from '@/components/lesson-form';
import Link from 'next/link';
import { appConfig } from '@/lib/env';

export default function CreateLessonPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className={`text-xl font-bold ${appConfig.headerText}`}>
            {appConfig.name}
          </Link>
        </div>
      </header>

      <main className="py-8 px-4">
        <UploadForm />
      </main>
    </div>
  );
}
