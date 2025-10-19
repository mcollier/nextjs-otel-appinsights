import Link from 'next/link';
import WeatherForm from './WeatherForm';

export default function WeatherPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <WeatherForm />

      <Link className="text-sm font-medium text-blue-600 hover:underline" href="/">
        Back to home
      </Link>
    </main>
  );
}
