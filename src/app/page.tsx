import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Harlem Digital Menu
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Welcome to the Harlem Digital Menu development scaffold.
          Use the links below to preview the placeholder screens.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
          <Link href="/t/demo">
            <Button size="lg" className="w-full h-full flex flex-col py-6">
              <span className="text-xl mb-2">Guest View</span>
              <span className="text-sm font-normal opacity-80">Interactive Menu Preview</span>
            </Button>
          </Link>
          <Link href="/staff">
            <Button size="lg" variant="outline" className="w-full h-full flex flex-col py-6">
              <span className="text-xl mb-2">Staff Dashboard</span>
              <span className="text-sm font-normal opacity-80">Order & Call Management</span>
            </Button>
          </Link>
          <Link href="/admin">
            <Button size="lg" variant="secondary" className="w-full h-full flex flex-col py-6">
              <span className="text-xl mb-2">Admin Panel</span>
              <span className="text-sm font-normal opacity-80">System Management</span>
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
