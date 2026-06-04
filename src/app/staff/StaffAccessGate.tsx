"use client";

import { FormEvent, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StaffAccessGate({ isAccessConfigured }: { isAccessConfigured: boolean }) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    isAccessConfigured ? null : 'Доступ персонала не настроен.'
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAccessConfigured) {
      setError('Доступ персонала не настроен.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/staff/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      if (response.status === 503) {
        setError('Доступ персонала не настроен.');
        return;
      }

      setError('Неверный код персонала.');
    } catch {
      setError('Не удалось проверить код. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Доступ персонала</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="staff-code" className="text-sm font-medium">
                Код персонала
              </label>
              <input
                id="staff-code"
                type="password"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={!isAccessConfigured || isSubmitting}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!isAccessConfigured || isSubmitting}>
              {isSubmitting ? 'Проверка...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
