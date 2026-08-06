// Ruta protegida: "/dashboard" (requiere cookie certchain_token, ver middleware.ts)
export default function DashboardPage() {
  return (
    <div>
      <h1>Panel institucional</h1>
      <p>Resumen de certificados emitidos, pendientes y estado del sistema.</p>
    </div>
  );
}
