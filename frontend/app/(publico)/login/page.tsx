// Ruta pública: "/login"
// Está en (publico) porque, antes de autenticarse, el usuario aún no tiene sesión.
// Al loguearse correctamente (lógica real pendiente en backend), se debe setear
// la cookie "certchain_token" que el middleware busca para dar acceso a (institucional).
export default function LoginPage() {
  return (
    <div>
      <h1>Acceso institucional</h1>
      <p>Inicia sesión con tu cuenta institucional (universidad).</p>
      {/* TODO: formulario real -> POST /auth/login al backend, luego set-cookie certchain_token */}
      <form>
        <input type="email" placeholder="Correo institucional" />
        <input type="password" placeholder="Contraseña" />
        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
}
