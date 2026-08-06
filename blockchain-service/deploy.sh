#!/bin/sh
set -e  # si algo falla, el contenedor termina con error (visible en logs)

# 1) Esperar a que anvil esté listo (los contenedores arrancan juntos,
#    no hay garantía de orden — esto elimina la carrera)
until cast chain-id --rpc-url http://anvil:8545 > /dev/null 2>&1; do
  echo "Esperando a anvil..."
  sleep 1
done
echo "anvil listo ✓"

# 2) Desplegar el contrato. La salida completa se captura en $OUT
OUT=$(forge create src/CertificateRegistry.sol:AcademicCertificates \
  --broadcast \
  --rpc-url http://anvil:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 2>&1)
STATUS=$?
echo "$OUT"

# Si forge falló, imprimir el error y terminar (en vez de morir en silencio)
if [ "$STATUS" -ne 0 ]; then
  echo "ERROR: forge create fallo (exit ${STATUS})" >&2
  exit "$STATUS"
fi

# 3) Extraer la dirección ("Deployed to: 0x...") y guardarla en el
#    volumen compartido /shared — el server la lee de ahí
echo "$OUT" | sed -n 's/Deployed to: \(0x[a-fA-F0-9]*\).*/\1/p' > /shared/CONTRACT_ADDRESS

if [ -s /shared/CONTRACT_ADDRESS ]; then
  echo "Contrato desplegado en: $(cat /shared/CONTRACT_ADDRESS) ✓"
else
  echo "ERROR: no se pudo extraer la dirección del contrato" >&2
  exit 1
fi
