// Ruta protegida: "/certificados" (requiere cookie certchain_token, ver middleware.ts)
export default function CertificadosPage() {
  return (
    <div>
      <h1>Gestión de certificados</h1>
      <p>Aquí el personal institucional emite y administra certificados en blockchain.</p>
      {/* TODO: formulario real -> POST al backend, que a su vez llama a blockchain-service */}
    </div>
  );
}
