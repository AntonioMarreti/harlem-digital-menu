import { tables, categories, menuItems } from '@/lib/mock-data';
import GuestPageClient from './GuestPageClient';

export default function GuestTablePage({ params }: { params: { tableId: string } }) {
  const table = tables.find((t) => t.id === params.tableId || t.qrSlug === params.tableId) ?? {
    id: params.tableId,
    qrSlug: params.tableId,
    name: `Стол ${params.tableId}`,
    number: 0,
  };

  return <GuestPageClient table={table} categories={categories} menuItems={menuItems} />;
}
