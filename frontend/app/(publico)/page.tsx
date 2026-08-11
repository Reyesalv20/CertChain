import Link from 'next/link';
import { BlockchainIcon, ShieldIcon } from '@/components/icons';

// Ruta: "/" (los route groups como (publico) no aparecen en la URL)
export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <p className="text-xs font-mono uppercase tracking-widest mb-4 text-steel">Sistema de certificación</p>
      <div className="flex justify-center mb-6">
        <ShieldIcon size={48} color="#1F4E5F" />
      </div>
      <h1 className="font-display text-navy text-4xl sm:text-5xl leading-tight mb-5">
        Certificados académicos
        <br />
        respaldados por blockchain
      </h1>
      <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-10">
        CertChain permite a las instituciones emitir credenciales imposibles de falsificar y a cualquier persona
        verificarlas en segundos, sin necesidad de crear una cuenta.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        <Link
          href="/verificar"
          className="px-6 py-3 text-sm font-semibold text-white rounded-sm bg-navy hover:bg-navy-dark transition-colors"
        >
          Verificar un certificado
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 text-sm font-semibold text-navy rounded-sm border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Acceso institucional
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        {[
          {
            title: 'Sella y registra',
            text: 'Cada documento se sella con hash SHA-256 y se inscribe de forma permanente en la blockchain.',
          },
          {
            title: 'Verifica al instante',
            text: 'Cualquier persona puede confirmar la autenticidad con el código del certificado o su tarjeta RFID.',
          },
          {
            title: 'Consulta con IA',
            text: 'Un asistente responde preguntas sobre cada certificado ya verificado.',
          },
        ].map((f) => (
          <div key={f.title} className="bg-white border border-gray-200 rounded-sm p-5">
            <div className="text-steel mb-3">
              <BlockchainIcon size={22} />
            </div>
            <p className="font-semibold text-navy text-sm mb-1.5">{f.title}</p>
            <p className="text-gray-500 text-xs leading-relaxed">{f.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
