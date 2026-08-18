#!/bin/sh
set -e  # si algo falla, el contenedor termina con error (visible en logs)

ADMIN_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ISSUER_KEY=${ISSUER_PRIVATE_KEY:?Se necesita ISSUER_PRIVATE_KEY}

until cast chain-id --rpc-url http://anvil:8545 > /dev/null 2>&1; do
  echo "Esperando a anvil..."
  sleep 1
done
echo "anvil listo ✓"

# 1) Deploy del registry
OUT=$(forge create src/TrustedIssuersRegistry.sol:TrustedIssuersRegistry \
    --broadcast \
    --rpc-url http://anvil:8545 \
    --private-key "$ADMIN_KEY" 2>&1)
echo "$OUT"
REGISTRY=$(echo "$OUT" | sed -n 's/Deployed to: \(0x[a-fA-F0-9]*\).*/\1/p')
[ -n "$REGISTRY" ] || { echo "ERROR: no se pudo deployar el registry" >&2; exit 1; }

# 2) Desplegar el contrato. La salida completa se captura en $OUT
OUT=$(forge create src/CertificateRegistry.sol:AcademicCertificates \
  --broadcast \
  --rpc-url http://anvil:8545 \
  --private-key "$ADMIN_KEY" \
  --constructor-args "$REGISTRY" 2>&1)
echo "$OUT"
CERTIFICATES=$(echo "$OUT" | sed -n 's/Deployed to: \(0x[a-fA-F0-9]*\).*/\1/p')
[ -n "$CERTIFICATES" ] || { echo "ERROR: no se pudo deployar certificates" >&2; exit 1; }

echo "Registry:     $REGISTRY"
echo "Certificates: $CERTIFICATES"

# 3) El admin aprueba al emisor (la cuenta del server)
ISSUER=$(cast wallet address --private-key "$ISSUER_KEY")
echo "Emisor confiable: $ISSUER"
cast send "$REGISTRY" "addIssuer(address,string)" "$ISSUER" "Universidad de Vanguardia" \
    --rpc-url http://anvil:8545 --private-key "$ADMIN_KEY"

# 4) Guardar ambas direcciones en el volumen compartido
echo "$REGISTRY" > /shared/TRUSTED_ISSUERS_ADDRESS
echo "$CERTIFICATES" > /shared/CONTRACT_ADDRESS
echo "List"
