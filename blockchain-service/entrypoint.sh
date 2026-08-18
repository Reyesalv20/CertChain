#!/bin/sh
set -e

# 1) Esperar la dirección del contrato que escribe deploy.sh en /shared
#    (el volumen compartido entre el contenedor deploy y el server)
for i in $(seq 1 60); do
  if [ -s /shared/CONTRACT_ADDRESS ]; then
    break
  fi
  echo "Esperando la direccion del contrato... (${i}s)"
  sleep 1
done

# 2) Si pasaron 60s y no hay dirección, es un error real (no seguir a ciegas)
if [ ! -s /shared/CONTRACT_ADDRESS ]; then
  echo "ERROR: deploy.sh no escribio la direccion del contrato" >&2
  exit 1
fi

# 3) Exportar la dirección como variable de entorno y arrancar el server
#    (misma mecánica que tu .env, pero generada en runtime por el deploy)
export CONTRACT_ADDRESS="$(cat /shared/CONTRACT_ADDRESS)"
echo "Contrato: ${CONTRACT_ADDRESS} ✓"

export TRUSTED_ISSUERS_ADDRESS="$(cat /shared/TRUSTED_ISSUERS_ADDRESS)"
echo "Registry: ${TRUSTED_ISSUERS_ADDRESS} "

# 4) VERIFICAR que el contrato exista de verdad en la cadena.
#    anvil es efímero (guarda todo en memoria): si se reinició sin que
#    deploy volviera a correr, la dirección del volumen queda VIEJA y
#    el server fallaría con errores crípticos ("could not decode result
#    data"). Este chequeo convierte eso en un mensaje claro.
RESP=$(wget -qO- --post-data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"${CONTRACT_ADDRESS}\",\"latest\"],\"id\":1}" --header "Content-Type: application/json" http://anvil:8545)
case "$RESP" in
  *'"result":"0x"'*)
    echo "ERROR: el contrato ${CONTRACT_ADDRESS} NO existe en la cadena." >&2
    echo "El anvil se reinició sin que deploy.sh volviera a correr." >&2
    echo "Solución: docker compose down -v && docker compose up -d" >&2
    exit 1 ;;
  *'"result":"0x'*)
    echo "Contrato verificado en la cadena ✓" ;;
  *)
    echo "ADVERTENCIA: no pude verificar el contrato (${RESP})" >&2 ;;
esac

REG_RESP=$(wget -qO- --post-data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"${TRUSTED_ISSUERS_ADDRESS}\",\"latest\"],\"id\":1}" --header "Content-Type: application/json" http://anvil:8545)
case "$REG_RESP" in
  *'"result":"0x"'*)
    echo "ERROR: el registry ${TRUSTED_ISSUERS_ADDRESS} NO existe en la cadena." >&2
    echo "Solución: docker compose down -v && docker compose up -d" >&2
    exit 1 ;;
  *'"result":"0x'*)
    echo "Registry verificado en la cadena ✓" ;;
  *)
    echo "ADVERTENCIA: no pude verificar el registry (${REG_RESP})" >&2 ;;
esac

echo "Arrancando server en el puerto 3000..."
exec node server.js
