import Link from 'next/link';

// Ruta: "/" (los route groups como (publico) no aparecen en la URL)
export default function HomePage() {
  return (
    <div>
      <h1>CertChain</h1>
      <p>Verifica la autenticidad de certificados académicos emitidos en blockchain.</p>
      <p>
        <Link href="/verificar">Verificar un certificado</Link>
      </p>
      <p>
        <Link href="/login">Acceso institucional</Link>
      </p>
    </div>
  );
}
