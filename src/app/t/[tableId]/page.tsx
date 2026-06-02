import { notFound } from 'next/navigation';
import { tables, categories, menuItems } from '@/lib/mock-data';
import GuestPageClient from './GuestPageClient';

export default function GuestTablePage({ params }: { params: { tableId: string } }) {
  const table = tables.find((t) => t.id === params.tableId);

  if (!table) {
    notFound();
  }

  return <GuestPageClient table={table} categories={categories} menuItems={menuItems} />;
}
