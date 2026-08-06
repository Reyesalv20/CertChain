// Ruta pública: "/verificar"
// Placeholder: cualquier persona (empleador, público general) puede
// verificar un certificado por su hash, sin necesidad de iniciar sesión.
export default function VerificarPage() {
  return (
    <div>
      <h1>Verificar certificado</h1>
      <p>
        Introduce el código / hash del certificado (impreso o en el QR/RFID)
        para comprobar su autenticidad contra la blockchain.
      </p>
      {/* TODO: formulario real -> POST a blockchain-service vía backend */}
      <form>
        <input type="text" placeholder="Hash del certificado" />
        <button type="submit">Verificar</button>
      </form>
    </div>
  );
}
