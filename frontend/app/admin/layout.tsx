import type { ReactNode } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';

// Layout del área administrativa. La protección/rol real se define en el
// backend (rol 'admin' vía la tabla usuarios); acá solo el chrome visual.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <AdminNavbar />
      {children}
    </div>
  );
}
