import { ethers } from "ethers";
import "./style.css";
import { config, readProvider, certRead, registryRead } from "./chain.js";

const latestEl = document.getElementById("latest");
const blocksEl = document.getElementById("blocks");
const blockDetailEl = document.getElementById("blockDetail");
const txDetailEl = document.getElementById("txDetail");
const autoRefreshEl = document.getElementById("autoRefresh");

const shortHash = (h) => (h ? h.slice(0, 12) + "…" + h.slice(-10) : "—");

// Intenta decodificar un log (evento) con el ABI de uno u otro contrato.
function tryParseLog(log) {
  for (const c of [certRead, registryRead]) {
    try { return c.interface.parseLog(log); } catch { /* probar el otro contrato */ }
  }
  return null;
}

// Intenta decodificar la llamada de una tx (función + args) contra el contrato destino.
function decodeCall(tx) {
  const targets = [
    [config.certificates.address, certRead],
    [config.registry.address, registryRead],
  ];
  for (const [addr, contract] of targets) {
    if (tx.to && tx.to.toLowerCase() === addr.toLowerCase()) {
      try {
        const parsed = contract.interface.parseTransaction({ data: tx.data, value: tx.value });
        return parsed ? `${parsed.name}(${parsed.args.map((a) => a.toString()).join(", ")})` : null;
      } catch { return null; }
    }
  }
  return null;
}

// ── Bloques ───────────────────────────────────────────────────────
async function refreshBlocks() {
  const latest = Number(await readProvider.getBlockNumber());
  latestEl.textContent = "Bloque actual: #" + latest;
  const from = Math.max(0, latest - 9); // últimos 10 bloques
  const items = [];
  for (let n = from; n <= latest; n++) {
    items.push(await readProvider.getBlock(n));
  }
  renderBlocks(items);
}

function renderBlocks(items) {
  blocksEl.innerHTML = items
    .map((b) => `
      <button class="block" data-n="${b.number}">
        <span class="block-num">#${b.number}</span>
        <span class="block-tx">${b.transactions.length} tx</span>
        <span class="block-time">${new Date(Number(b.timestamp) * 1000).toLocaleTimeString()}</span>
        <span class="block-hash">hash <code>${shortHash(b.hash)}</code></span>
        <span class="block-parent">parent <code>${shortHash(b.parentHash)}</code></span>
      </button>`)
    .join("");
  document.querySelectorAll(".block[data-n]").forEach((el) => {
    el.addEventListener("click", () => selectBlock(Number(el.dataset.n)));
  });
}

async function selectBlock(n) {
  const b = await readProvider.getBlock(n);
  const txs = b.transactions; // array de hashes
  blockDetailEl.innerHTML = `
    <div class="detail-row"><span>Número</span><code>${b.number}</code></div>
    <div class="detail-row"><span>Hash</span><code>${b.hash}</code></div>
    <div class="detail-row"><span>Parent hash</span><code>${b.parentHash}</code></div>
    <div class="detail-row"><span>Timestamp</span><code>${new Date(Number(b.timestamp) * 1000).toLocaleString()}</code></div>
    <div class="detail-row"><span>Miner</span><code>${b.miner ?? "—"}</code></div>
    <div class="detail-row"><span>Gas limit</span><code>${b.gasLimit.toString()}</code></div>
    <div class="detail-row"><span>Gas used</span><code>${b.gasUsed ? b.gasUsed.toString() : "—"}</code></div>
    <div class="detail-row"><span>Transacciones (${txs.length})</span></div>
    <div class="tx-list">${txs.length === 0 ? "<em>vacío</em>" : txs.map((h) => `<button class="chip" data-hash="${h}">${shortHash(h)}</button>`).join("")}</div>
  `;
  blockDetailEl.querySelectorAll("[data-hash]").forEach((el) => {
    el.addEventListener("click", () => viewTx(el.dataset.hash));
  });
}

// ── Transacción ───────────────────────────────────────────────────
async function viewTx(hash) {
  const tx = await readProvider.getTransaction(hash);
  if (!tx) { txDetailEl.innerHTML = "<em>Transacción no encontrada.</em>"; return; }
  const receipt = await readProvider.getTransactionReceipt(hash);
  const decoded = decodeCall(tx);
  const logs = (receipt?.logs ?? []).map((log) => {
    const parsed = tryParseLog(log);
    return parsed ? `${parsed.name}(${parsed.args.map((a) => a.toString()).join(", ")})` : "log";
  });
  txDetailEl.innerHTML = `
    <div class="detail-row"><span>Hash</span><code>${tx.hash}</code></div>
    ${decoded ? `<div class="detail-row"><span>Función</span><code>${decoded}</code></div>` : ""}
    <div class="detail-row"><span>From (quién firmó)</span><code>${tx.from}</code></div>
    <div class="detail-row"><span>To</span><code>${tx.to ?? "(deploy de contrato)"}</code></div>
    <div class="detail-row"><span>Nonce</span><code>${tx.nonce}</code></div>
    <div class="detail-row"><span>Value</span><code>${tx.value.toString()}</code></div>
    <div class="detail-row"><span>Gas limit</span><code>${tx.gasLimit.toString()}</code></div>
    <div class="detail-row"><span>Bloque</span><code>#${receipt?.blockNumber ?? "—"}</code></div>
    <div class="detail-row"><span>Status</span><code>${receipt ? (receipt.status === 1 ? "✓ success" : "✗ reverted") : "pendiente"}</code></div>
    <div class="detail-row"><span>Gas used</span><code>${receipt ? receipt.gasUsed.toString() : "—"}</code></div>
    <div class="detail-row"><span>Logs (eventos)</span></div>
    <div class="tx-list">${logs.length ? logs.map((l) => `<code>${l}</code>`).join("") : "<em>sin logs</em>"}</div>
  `;
}

document.getElementById("viewTxBtn").addEventListener("click", async () => {
  const hash = document.getElementById("txHash").value.trim();
  if (!hash) { txDetailEl.innerHTML = "<em>Pegá un hash de transacción.</em>"; return; }
  try { await viewTx(hash); } catch (err) { txDetailEl.innerHTML = "Error: " + err.message; }
});

// ── Auto-refresh ──────────────────────────────────────────────────
let timer = null;
function start() { refreshBlocks(); timer = setInterval(refreshBlocks, 4000); }
function stop() { if (timer) clearInterval(timer); timer = null; }
autoRefreshEl.addEventListener("change", () => (autoRefreshEl.checked ? start() : stop()));
start();
