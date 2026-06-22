const API_BASE = '/dashboard/api';

const elements = {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  statusSubtext: document.getElementById('statusSubtext'),
  saleId: document.getElementById('saleId'),
  sold: document.getElementById('soldCount'),
  reserved: document.getElementById('reservedCount'),
  free: document.getElementById('freeCount'),
  tickets: document.getElementById('ticketsCount'),
  buyersCreated: document.getElementById('buyersCreated'),
  loadStatus: document.getElementById('loadStatus'),
  seatTypeGrid: document.getElementById('seatTypeGrid'),
  miniSeatMap: document.getElementById('miniSeatMap'),
  eventsList: document.getElementById('eventsList'),
  generateBtn: document.getElementById('generateBtn'),
  restartBtn: document.getElementById('restartBtn'),
  buyersInput: document.getElementById('buyersInput'),
  buyerType: document.getElementById('buyerType'),
  lastRefresh: document.getElementById('lastRefresh'),
  toastArea: document.getElementById('toastArea'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlayTitle'),
  overlayText: document.getElementById('overlayText'),
};

let pollingHandle = null;
let lastMilestones = new Set();
const milestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function escapeText(value) {
  return String(value ?? '');
}

function showToast(title, message, variant = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${variant}`;
  toast.innerHTML = `<div class="toast-title">${escapeText(title)}</div><div class="toast-body">${escapeText(message)}</div>`;
  elements.toastArea.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}

function renderSeatTypes(seatsByType) {
  const order = [
    ['platino', 'Platino'],
    ['preferente', 'Preferente'],
    ['normal', 'Normal'],
  ];

  elements.seatTypeGrid.innerHTML = order.map(([key, label]) => {
    const data = seatsByType?.[key] || {};
    const free = Number(data.free ?? 0);
    const sold = Number(data.sold ?? 0);
    const reserved = Number(data.reserved ?? 0);
    const total = Number(data.total ?? (free + sold + reserved));

    return `
      <article class="seat-type-card">
        <div class="seat-type-head">
          <h3>${escapeText(label)}</h3>
          <span>Total ${escapeText(total)}</span>
        </div>
        <div class="seat-type-split">
          <div class="seat-type-block free">
            <span>Libres</span>
            <strong>${escapeText(free)}</strong>
          </div>
          <div class="seat-type-block sold">
            <span>Comprados</span>
            <strong>${escapeText(sold)}</strong>
          </div>
        </div>
        <p class="seat-type-foot">Reservados en tránsito: ${escapeText(reserved)}</p>
      </article>
    `;
  }).join('');
}

function renderMiniMap(seatStatus) {
  if (!seatStatus || seatStatus.length === 0) {
    elements.miniSeatMap.innerHTML = '<div class="empty-state">Sin mapa disponible.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const sectionBreaks = new Set([2, 6]);
  for (let row = 0; row < seatStatus.length; row += 1) {
    for (let col = 0; col < seatStatus[row].length; col += 1) {
      const cell = document.createElement('div');
      const state = seatStatus[row][col];
      cell.className = `seat ${state === 'SOLD' ? 'sold' : state === 'RESERVED' ? 'reserved' : 'free'}`;
      cell.title = `Fila ${row + 1}, Asiento ${col + 1}: ${state}`;
      fragment.appendChild(cell);
    }
    if (sectionBreaks.has(row)) {
      const spacer = document.createElement('div');
      spacer.className = 'mini-seat-gap';
      fragment.appendChild(spacer);
    }
  }

  elements.miniSeatMap.innerHTML = '';
  elements.miniSeatMap.appendChild(fragment);
}

function renderEvents(events) {
  if (!events || events.length === 0) {
    elements.eventsList.innerHTML = '<li class="empty-state">Sin eventos recientes.</li>';
    return;
  }

  const recent = events.slice(-20).reverse();
  elements.eventsList.innerHTML = recent.map((event) => {
    const parts = [event.type || 'evento'];
    if (event.reason) parts.push(`motivo=${event.reason}`);
    if (event.zone) parts.push(`zona=${event.zone}`);
    if (event.ticket_id) parts.push(`ticket=${event.ticket_id}`);
    if (event.reservation_id) parts.push(`reserva=${event.reservation_id}`);
    if (event.buyer_id) parts.push(`comprador=${event.buyer_id}`);
    if (event.sold_count !== undefined) parts.push(`vendidos=${event.sold_count}`);
    if (event.job_id) parts.push(`job=${event.job_id}`);

    return `
      <li class="event-item">
        <div class="event-ts">${escapeText(event.ts || '')}</div>
        <div class="event-body">${escapeText(parts.join(' · '))}</div>
      </li>
    `;
  }).join('');
}

function renderLoadJobs(loadJobs) {
  if (!loadJobs || loadJobs.length === 0) {
    elements.loadStatus.textContent = 'Sin cargas activas.';
    return;
  }

  const activeJob = loadJobs.find((job) => job.status === 'running') || loadJobs[0];
  const elapsed = activeJob.elapsed ? `${Number(activeJob.elapsed).toFixed(2)} s` : 'en curso';
  const result = activeJob.result ? `success=${activeJob.result.success} fail=${activeJob.result.fail}` : activeJob.error || '';
  elements.loadStatus.textContent = `Carga ${activeJob.job_id} · ${activeJob.status} · ${elapsed}${result ? ` · ${result}` : ''}`;
}

function updateOverlay(state, closeReason) {
  if (state === 'closed') {
    elements.overlay.classList.remove('hidden');
    elements.overlay.setAttribute('aria-hidden', 'false');
    elements.overlayTitle.textContent = 'Venta cerrada';
    elements.overlayText.textContent = closeReason ? `Motivo: ${closeReason}` : 'La venta terminó.';
  } else {
    elements.overlay.classList.add('hidden');
    elements.overlay.setAttribute('aria-hidden', 'true');
  }
}

function updateSummary(stats) {
  const saleStatus = stats.sale_status || {};
  const state = saleStatus.state || (stats.sales_closed ? 'closed' : (stats.sales_open ? 'open' : 'waiting'));

  elements.statusBadge.textContent = state === 'open' ? 'Abierta' : state === 'closed' ? 'Cerrada' : state === 'countdown' ? 'Cuenta regresiva' : 'Esperando';
  elements.statusText.textContent = state === 'open'
    ? 'La simulación está corriendo.'
    : state === 'closed'
      ? `Cierre: ${stats.close_reason || 'n/a'}`
      : 'La venta está activa.';
  elements.statusSubtext.textContent = 'Actualización por polling.';

  elements.saleId.textContent = stats.sale_id || 'n/a';
  elements.sold.textContent = stats.sold_count ?? 0;
  elements.reserved.textContent = stats.reserved_count ?? 0;
  elements.free.textContent = stats.free_count ?? 0;
  elements.tickets.textContent = stats.metrics?.ticket_request_ok ?? 0;
  elements.buyersCreated.textContent = stats.buyers_created ?? 0;

  renderSeatTypes(stats.seats_by_type || {});
  renderMiniMap(stats.seat_status || []);
  renderEvents(stats.recent_events || []);
  renderLoadJobs(stats.load_jobs || []);

  const soldCount = Number(stats.sold_count || 0);
  const totalSeats = 1500;
  const percent = Math.floor((soldCount / totalSeats) * 100);
  for (const milestone of milestones) {
    if (percent >= milestone && !lastMilestones.has(milestone)) {
      lastMilestones.add(milestone);
      showToast('Avance de venta', `${milestone}% de los asientos vendidos (${soldCount}/${totalSeats}).`, milestone === 100 ? 'success' : 'info');
    }
  }

  updateOverlay(state, stats.close_reason);
  elements.lastRefresh.textContent = `Actualizado ${new Date().toLocaleTimeString()}`;
}

async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const stats = await response.json();
    updateSummary(stats);
  } catch (error) {
    elements.statusBadge.textContent = 'Offline';
    elements.statusText.textContent = `No se pudo conectar: ${error.message}`;
    elements.lastRefresh.textContent = `Error ${new Date().toLocaleTimeString()}`;
    updateOverlay('waiting');
  }
}

async function generateLoad() {
  const buyers = Math.max(1, parseInt(elements.buyersInput.value || '50', 10));
  const clientType = elements.buyerType.value || 'normal';

  elements.generateBtn.disabled = true;
  try {
    const response = await fetch(`${API_BASE}/generate-load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyers, client_type: clientType }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.code || `HTTP ${response.status}`);
    showToast('Carga iniciada', `Job ${payload.job?.job_id || 'n/a'} con ${buyers} compradores.`, 'success');
    await fetchStats();
  } catch (error) {
    showToast('Error', `No fue posible iniciar la carga: ${error.message}`, 'warn');
  } finally {
    elements.generateBtn.disabled = false;
  }
}

async function restartSale() {
  if (!confirm('¿Reiniciar la venta? Se limpiarán reservas, eventos y cargas.')) return;
  elements.restartBtn.disabled = true;
  elements.overlay.classList.remove('hidden');
  elements.overlay.setAttribute('aria-hidden', 'false');
  elements.overlayTitle.textContent = 'Reiniciando venta...';
  elements.overlayText.textContent = 'Limpieza de estado en curso.';

  try {
    const response = await fetch(`${API_BASE}/restart-sale`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 3500));
    lastMilestones = new Set();
    await fetchStats();
    showToast('Venta reiniciada', 'El dashboard y el backend quedaron limpios.', 'success');
  } catch (error) {
    showToast('Error', `No fue posible reiniciar: ${error.message}`, 'warn');
  } finally {
    elements.restartBtn.disabled = false;
  }
}

function startPolling() {
  if (pollingHandle) clearInterval(pollingHandle);
  pollingHandle = setInterval(fetchStats, 800);
}

elements.generateBtn.addEventListener('click', generateLoad);
elements.restartBtn.addEventListener('click', restartSale);

document.addEventListener('DOMContentLoaded', async () => {
  await fetchStats();
  startPolling();
});
