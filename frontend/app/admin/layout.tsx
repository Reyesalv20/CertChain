import type { ReactNode } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { WalletProvider } from '@/hooks/useWallet';

// Layout del área administrativa. La protección/rol se define en el middleware
// (rol 'admin' vía app_metadata) y el backend; acá solo el chrome visual.
// WalletProvider habilita el panel de firma (MetaMask) en páginas admin que lo
// necesitan (p.ej. agregar una wallet de institución firmando addIssuer).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-[#f8fafb]">
        <AdminNavbar />
        {children}
      </div>
    </WalletProvider>
  );
}
