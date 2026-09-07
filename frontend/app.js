/**
 * SISTEMA DE GESTIÓN DE BOLETOS FÍSICOS - FRONTEND JAVASCRIPT VANILLA
 */

const API_BASE = window.location.origin;

// Estado Global
let token = localStorage.getItem('token') || null;
let currentEvents = [];
let selectedEventId = null;
let currentTicketForDelivery = null;

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

// Headers de Autenticación
function getHeaders(isJson = true) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

// Navegación entre Pantallas (SPA)
function switchScreen(screenName) {
  document.querySelectorAll('.screen-view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(el => el.classList.remove('active'));

  const targetScreen = document.getElementById(`screen-${screenName}`);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
  }

  document.querySelectorAll(`[data-screen="${screenName}"]`).forEach(el => el.classList.add('active'));

  if (screenName === 'dashboard' && selectedEventId) {
    loadDashboard(selectedEventId);
  }
}

// Checkear sesión activa
async function checkAuth() {
  if (!token) {
    document.getElementById('main-header').classList.add('hidden');
    switchScreen('login');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (res.ok) {
      const user = await res.json();
      document.getElementById('user-display').innerHTML = `<i class="fa-solid fa-circle-user"></i> ${user.username}`;
      document.getElementById('main-header').classList.remove('hidden');
      await loadEvents();
      switchScreen('dashboard');
    } else {
      logout();
    }
  } catch (err) {
    console.error('Error al verificar sesión:', err);
    logout();
  }
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value;
  const passwordInput = document.getElementById('login-password').value;
  const errorBox = document.getElementById('login-error');

  errorBox.classList.add('hidden');

  const formData = new URLSearchParams();
  formData.append('username', usernameInput);
  formData.append('password', passwordInput);

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      token = data.access_token;
      localStorage.setItem('token', token);
      showToast('¡Bienvenido al sistema!', 'success');
      await checkAuth();
    } else {
      const error = await res.json();
      errorBox.textContent = error.detail || 'Credenciales incorrectas';
      errorBox.classList.remove('hidden');
    }
  } catch (err) {
    errorBox.textContent = 'Error de conexión con el servidor.';
    errorBox.classList.remove('hidden');
  }
});

// Logout
function logout() {
  token = null;
  localStorage.removeItem('token');
  document.getElementById('main-header').classList.add('hidden');
  switchScreen('login');
  showToast('Sesión cerrada correctamente', 'success');
}
document.getElementById('btn-logout').addEventListener('click', logout);

// Toggle Mostrar Contraseña
document.getElementById('btn-toggle-pwd').addEventListener('click', () => {
  const pwdInput = document.getElementById('login-password');
  const icon = document.querySelector('#btn-toggle-pwd i');
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    pwdInput.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
});

// Cargar Eventos
async function loadEvents() {
  try {
    const res = await fetch(`${API_BASE}/eventos`, { headers: getHeaders() });
    if (res.ok) {
      currentEvents = await res.json();
      
      const globalSelect = document.getElementById('global-event-select');
      const ventaSelect = document.getElementById('venta-evento-select');

      globalSelect.innerHTML = '';
      ventaSelect.innerHTML = '';

      if (currentEvents.length === 0) {
        globalSelect.innerHTML = '<option value="">Sin eventos activos</option>';
        return;
      }

      currentEvents.forEach(evt => {
        const opt = `<option value="${evt.id}">${evt.nombre}</option>`;
        globalSelect.innerHTML += opt;
        ventaSelect.innerHTML += opt;
      });

      selectedEventId = currentEvents[0].id;
      globalSelect.value = selectedEventId;
    }
  } catch (err) {
    console.error('Error al cargar eventos:', err);
  }
}

// Selector Global de Eventos
document.getElementById('global-event-select').addEventListener('change', (e) => {
  selectedEventId = e.target.value;
  loadDashboard(selectedEventId);
});

// Cargar Dashboard & KPIs
async function loadDashboard(eventId) {
  if (!eventId) return;

  try {
    // 1. KPIs
    const resKpi = await fetch(`${API_BASE}/eventos/${eventId}/kpis`, { headers: getHeaders() });
    if (resKpi.ok) {
      const kpi = await resKpi.json();
      document.getElementById('kpi-event-name').textContent = kpi.nombre_evento;
      
      // Cobertura de matriculados
      document.getElementById('kpi-matriculados-reach').textContent = `${kpi.estudiantes_matriculados_con_boleto} / ${kpi.estudiantes_matriculados_total}`;
      document.getElementById('kpi-matriculados-pct').textContent = `${kpi.porcentaje_cobertura_matriculados}% de matriculados`;

      document.getElementById('kpi-total').textContent = kpi.total_boletos;
      document.getElementById('kpi-recaudado').textContent = `S/ ${kpi.total_recaudado.toFixed(2)}`;
      document.getElementById('kpi-pendiente').textContent = `S/ ${kpi.total_pendiente.toFixed(2)}`;
      document.getElementById('kpi-vendidos').textContent = kpi.pagados;
      document.getElementById('kpi-parciales').textContent = kpi.parcialmente_pagados;
      document.getElementById('kpi-entregados').textContent = kpi.entregados;
    }

    // 2. Tabla de Boletos del Evento
    const resTickets = await fetch(`${API_BASE}/tickets?evento_id=${eventId}`, { headers: getHeaders() });
    if (resTickets.ok) {
      const tickets = await resTickets.json();
      renderTicketsTable(tickets);
    }
  } catch (err) {
    console.error('Error al cargar dashboard:', err);
  }
}

// Renderizar Tabla de Boletos
function renderTicketsTable(tickets) {
  const tbody = document.getElementById('tickets-table-body');
  tbody.innerHTML = '';

  if (tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center">No hay boletos registrados en este evento.</td></tr>';
    return;
  }

  tickets.forEach(t => {
    const estadoClass = `badge-${t.estado}`;
    const entregadoBadge = t.entregado ? '<span class="badge badge-entregado"><i class="fa-solid fa-check"></i> Sí</span>' : '<span class="badge badge-separado">No</span>';
    const fechaEntrega = t.fecha_hora_entrega ? new Date(t.fecha_hora_entrega).toLocaleString() : '-';
    const recolector = t.nombre_recolector ? t.nombre_recolector : t.nombre_alumno;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong class="text-primary">#${t.numero_boleto}</strong></td>
      <td>${t.codigo_alumno}</td>
      <td>${t.nombre_alumno}</td>
      <td>${t.carrera} (${t.ciclo}º)</td>
      <td>${recolector}</td>
      <td><span class="badge ${estadoClass}">${t.estado.replace('_', ' ')}</span></td>
      <td>S/ ${t.monto_total.toFixed(2)}</td>
      <td class="text-emerald">S/ ${t.monto_pagado.toFixed(2)}</td>
      <td class="${t.monto_pendiente > 0 ? 'text-rose font-bold' : ''}">S/ ${t.monto_pendiente.toFixed(2)}</td>
      <td>${t.metodo_pago.toUpperCase()}</td>
      <td>${entregadoBadge}</td>
      <td>${fechaEntrega}</td>
    `;
    tbody.appendChild(row);
  });
}

// Filtro de Búsqueda en Tabla del Dashboard
document.getElementById('table-search-input').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#tickets-table-body tr');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
});

// Exportar Excel
document.getElementById('btn-export-excel').addEventListener('click', async () => {
  if (!selectedEventId) return;
  try {
    const res = await fetch(`${API_BASE}/eventos/${selectedEventId}/exportar/excel`, { headers: getHeaders(false) });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_boletos_${selectedEventId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Reporte Excel descargado', 'success');
    }
  } catch (err) {
    showToast('Error al descargar archivo Excel', 'error');
  }
});

// Exportar CSV
document.getElementById('btn-export-csv').addEventListener('click', async () => {
  if (!selectedEventId) return;
  try {
    const res = await fetch(`${API_BASE}/eventos/${selectedEventId}/exportar/csv`, { headers: getHeaders(false) });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_boletos_${selectedEventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Reporte CSV descargado', 'success');
    }
  } catch (err) {
    showToast('Error al descargar archivo CSV', 'error');
  }
});

// ================= Autocompletado de Código de Alumno =================
const inputCodigo = document.getElementById('venta-codigo');
const dropdownAuto = document.getElementById('autocomplete-results');

inputCodigo.addEventListener('input', async (e) => {
  const val = e.target.value.trim();
  if (val.length < 1) {
    dropdownAuto.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/estudiantes/buscar?q=${encodeURIComponent(val)}`, { headers: getHeaders() });
    if (res.ok) {
      const list = await res.json();
      if (list.length === 0) {
        dropdownAuto.classList.add('hidden');
        return;
      }

      dropdownAuto.innerHTML = '';
      list.forEach(est => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `<strong>${est.codigo} - ${est.nombre}</strong><span>${est.carrera} | Ciclo ${est.ciclo}</span>`;
        item.addEventListener('click', () => {
          document.getElementById('venta-codigo').value = est.codigo;
          document.getElementById('venta-nombre').value = est.nombre;
          document.getElementById('venta-carrera').value = est.carrera;
          document.getElementById('venta-ciclo').value = est.ciclo;
          dropdownAuto.classList.add('hidden');
          updateRecolectoresInputs();
        });
        dropdownAuto.appendChild(item);
      });
      dropdownAuto.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error autocomplete:', err);
  }
});

document.addEventListener('click', (e) => {
  if (!inputCodigo.contains(e.target) && !dropdownAuto.contains(e.target)) {
    dropdownAuto.classList.add('hidden');
  }
});

// ================= Generador Dinámico de Recolectores según Cantidad =================
const inputCantidad = document.getElementById('venta-cantidad');
const inputBoletoInicial = document.getElementById('venta-boleto-inicial');
const recolectoresContainer = document.getElementById('recolectores-container');
const inputPrecioUnitario = document.getElementById('venta-precio-unitario');
const inputMontoPagado = document.getElementById('venta-monto-pagado');
const selectEstadoVenta = document.getElementById('venta-estado');

function updateRecolectoresInputs() {
  const cantidad = parseInt(inputCantidad.value) || 1;
  const boletoInicial = parseInt(inputBoletoInicial.value) || 1;
  const nombreComprador = document.getElementById('venta-nombre').value || '';

  recolectoresContainer.innerHTML = '';

  for (let i = 0; i < cantidad; i++) {
    const numBoleto = boletoInicial + i;
    const row = document.createElement('div');
    row.className = 'recolector-row';
    row.innerHTML = `
      <span class="recolector-tag">Boleto #${numBoleto}:</span>
      <input type="text" class="form-control input-recolector" placeholder="Nombre persona que recoge..." value="${nombreComprador}">
    `;
    recolectoresContainer.appendChild(row);
  }

  // Recalcular montos
  const precioUnit = parseFloat(inputPrecioUnitario.value) || 15.0;
  const totalCalculado = cantidad * precioUnit;

  if (selectEstadoVenta.value === 'pagado') {
    inputMontoPagado.value = totalCalculado.toFixed(2);
  } else if (selectEstadoVenta.value === 'separado') {
    inputMontoPagado.value = '0.00';
    document.getElementById('venta-metodo-pago').value = 'ninguno';
  }
}

inputCantidad.addEventListener('change', updateRecolectoresInputs);
inputCantidad.addEventListener('input', updateRecolectoresInputs);
inputBoletoInicial.addEventListener('input', updateRecolectoresInputs);
inputPrecioUnitario.addEventListener('input', updateRecolectoresInputs);
document.getElementById('venta-nombre').addEventListener('input', updateRecolectoresInputs);

selectEstadoVenta.addEventListener('change', () => {
  const cantidad = parseInt(inputCantidad.value) || 1;
  const precioUnit = parseFloat(inputPrecioUnitario.value) || 15.0;
  const totalCalculado = cantidad * precioUnit;

  if (selectEstadoVenta.value === 'pagado') {
    inputMontoPagado.value = totalCalculado.toFixed(2);
    if (document.getElementById('venta-metodo-pago').value === 'ninguno') {
      document.getElementById('venta-metodo-pago').value = 'efectivo';
    }
  } else if (selectEstadoVenta.value === 'separado') {
    inputMontoPagado.value = '0.00';
    document.getElementById('venta-metodo-pago').value = 'ninguno';
  }
});

// Inicializar recolectores
updateRecolectoresInputs();

// Registrar Venta Múltiple
document.getElementById('venta-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const cantidad = parseInt(inputCantidad.value) || 1;
  const boletoInicial = parseInt(inputBoletoInicial.value) || 1;
  const recolectorInputs = document.querySelectorAll('.input-recolector');

  const boletos = [];
  for (let i = 0; i < cantidad; i++) {
    const numBoleto = boletoInicial + i;
    const recolectorVal = recolectorInputs[i] ? recolectorInputs[i].value.trim() : '';
    boletos.push({
      numero_boleto: numBoleto,
      nombre_recolector: recolectorVal
    });
  }

  const payload = {
    evento_id: parseInt(document.getElementById('venta-evento-select').value),
    codigo_alumno: document.getElementById('venta-codigo').value,
    nombre_alumno: document.getElementById('venta-nombre').value,
    carrera: document.getElementById('venta-carrera').value,
    ciclo: document.getElementById('venta-ciclo').value,
    estado: selectEstadoVenta.value,
    precio_unitario: parseFloat(inputPrecioUnitario.value) || 15.0,
    monto_pagado_total: parseFloat(inputMontoPagado.value) || 0.0,
    metodo_pago: document.getElementById('venta-metodo-pago').value,
    boletos: boletos
  };

  try {
    const res = await fetch(`${API_BASE}/tickets/registrar-venta`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const ticketsCreados = await res.json();
      showToast(`¡Venta de ${ticketsCreados.length} boleto(s) registrada con éxito!`, 'success');

      // Renderizar resumen de boletos creados
      const primerBoleto = ticketsCreados[0];
      const ultimoBoleto = ticketsCreados[ticketsCreados.length - 1];
      const summaryBoletos = ticketsCreados.length > 1 
        ? `BOLETOS #${primerBoleto.numero_boleto} al #${ultimoBoleto.numero_boleto}`
        : `BOLETO #${primerBoleto.numero_boleto}`;

      document.getElementById('res-boletos-summary').textContent = summaryBoletos;
      document.getElementById('res-nombre-alumno').textContent = primerBoleto.nombre_alumno;
      document.getElementById('res-codigo-alumno').textContent = primerBoleto.codigo_alumno;
      document.getElementById('res-carrera-ciclo').textContent = `${primerBoleto.carrera} (${primerBoleto.ciclo}º)`;
      
      const totalTransaccion = primerBoleto.monto_total * ticketsCreados.length;
      const pagadoTransaccion = primerBoleto.monto_pagado * ticketsCreados.length;
      const pendienteTransaccion = primerBoleto.monto_pendiente * ticketsCreados.length;

      document.getElementById('res-monto-total').textContent = `S/ ${totalTransaccion.toFixed(2)}`;
      document.getElementById('res-monto-pagado').textContent = `S/ ${pagadoTransaccion.toFixed(2)}`;
      document.getElementById('res-monto-pendiente').textContent = `S/ ${pendienteTransaccion.toFixed(2)}`;
      document.getElementById('res-metodo-pago').textContent = primerBoleto.metodo_pago.toUpperCase();

      const estadoBadge = document.getElementById('res-estado-badge');
      estadoBadge.className = `badge badge-${primerBoleto.estado}`;
      estadoBadge.textContent = primerBoleto.estado.replace('_', ' ');

      // Lista de boletos asignados
      const listContainer = document.getElementById('res-boletos-list');
      listContainer.innerHTML = '';
      ticketsCreados.forEach(t => {
        const item = document.createElement('div');
        item.className = 'assigned-item';
        item.innerHTML = `<strong>Boleto #${t.numero_boleto}</strong> <span>Recoge: ${t.nombre_recolector}</span>`;
        listContainer.appendChild(item);
      });

      document.getElementById('ticket-result-card').classList.remove('hidden');
    } else {
      const err = await res.json();
      showToast(err.detail || 'Error al registrar la venta', 'error');
    }
  } catch (err) {
    showToast('Error de conexión con el servidor', 'error');
  }
});

// Resetear formulario para otra venta
document.getElementById('btn-nueva-venta-reset').addEventListener('click', () => {
  document.getElementById('ticket-result-card').classList.add('hidden');
  document.getElementById('venta-codigo').value = '';
  document.getElementById('venta-nombre').value = '';
  document.getElementById('venta-cantidad').value = '1';
  document.getElementById('venta-boleto-inicial').value = '';
  updateRecolectoresInputs();
});

// Entrega de Polladas (Búsqueda)
document.getElementById('entrega-search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('entrega-query').value.trim();
  if (query) {
    await searchTicketsForDelivery(query);
  }
});

async function searchTicketsForDelivery(query) {
  try {
    const res = await fetch(`${API_BASE}/tickets/buscar?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
    if (res.ok) {
      const tickets = await res.json();
      renderSearchResults(tickets);
    }
  } catch (err) {
    showToast('Error al buscar boletos', 'error');
  }
}

function renderSearchResults(tickets) {
  const container = document.getElementById('entrega-results-container');
  container.innerHTML = '';

  if (tickets.length === 0) {
    container.innerHTML = '<div class="alert alert-warning text-center">No se encontraron boletos con el número o criterio ingresado.</div>';
    return;
  }

  tickets.forEach(t => {
    const card = document.createElement('div');
    const isParcial = t.estado === 'parcialmente_pagado' || t.monto_pendiente > 0;
    card.className = `glass-panel ticket-found-card ${isParcial ? 'card-parcial' : ''} ${t.entregado ? 'card-entregado-border' : ''}`;

    const estadoBadge = `<span class="badge badge-${t.estado}">${t.estado.replace('_', ' ')}</span>`;
    const entregadoBadge = t.entregado 
      ? `<span class="badge badge-entregado"><i class="fa-solid fa-utensils"></i> ENTREGADO</span>`
      : `<span class="badge badge-separado"><i class="fa-solid fa-clock"></i> PENDIENTE DE ENTREGA</span>`;

    let alertBanner = '';
    if (isParcial && !t.entregado) {
      alertBanner = `
        <div class="financial-alert-banner banner-parcial">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>SALDO PENDIENTE POR COBRAR EN PUERTA:</strong><br>
          Monto Abonado: S/ ${t.monto_pagado.toFixed(2)} | <strong>Falta Cobrar: S/ ${t.monto_pendiente.toFixed(2)}</strong>
        </div>
      `;
    } else if (t.estado === 'pagado') {
      alertBanner = `
        <div class="financial-alert-banner banner-pagado">
          <i class="fa-solid fa-circle-check"></i>
          <strong>BOLETO 100% PAGADO (S/ ${t.monto_total.toFixed(2)})</strong>
        </div>
      `;
    }

    const fechaEntregaInfo = t.fecha_hora_entrega 
      ? `<p class="text-sm text-muted"><strong>Fecha Entrega:</strong> ${new Date(t.fecha_hora_entrega).toLocaleString()}</p>` 
      : '';

    card.innerHTML = `
      <div class="ticket-found-header">
        <h4>Boleto Físico #${t.numero_boleto}</h4>
        <div>${estadoBadge} ${entregadoBadge}</div>
      </div>

      ${alertBanner}

      <div class="ticket-found-info">
        <p><strong>Persona que Recoge:</strong> <span class="text-primary font-bold">${t.nombre_recolector || t.nombre_alumno}</span></p>
        <p><strong>Comprador:</strong> ${t.nombre_alumno}</p>
        <p><strong>Código / DNI:</strong> ${t.codigo_alumno}</p>
        <p><strong>Carrera / Ciclo:</strong> ${t.carrera} (${t.ciclo}º)</p>
        ${fechaEntregaInfo}
      </div>

      <div class="ticket-found-actions">
        ${!t.entregado ? `<button class="btn btn-emerald btn-confirm-entrega" data-num="${t.numero_boleto}" data-recolector="${t.nombre_recolector || t.nombre_alumno}" data-comprador="${t.nombre_alumno}" data-pendiente="${t.monto_pendiente}">
          <i class="fa-solid fa-check-double"></i> Confirmar Entrega
        </button>` : `<button class="btn btn-secondary" disabled><i class="fa-solid fa-check"></i> Ya Entregado</button>`}
      </div>
    `;

    container.appendChild(card);
  });

  // Listeners para confirmar entrega
  document.querySelectorAll('.btn-confirm-entrega').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const num = parseInt(e.currentTarget.getAttribute('data-num'));
      const recolector = e.currentTarget.getAttribute('data-recolector');
      const comprador = e.currentTarget.getAttribute('data-comprador');
      const pendiente = parseFloat(e.currentTarget.getAttribute('data-pendiente')) || 0.0;
      openConfirmModal(num, recolector, comprador, pendiente);
    });
  });
}

// Modal Confirmación de Entrega
function openConfirmModal(numBoleto, recolector, comprador, pendiente) {
  currentTicketForDelivery = numBoleto;
  document.getElementById('modal-confirm-boleto').textContent = `#${numBoleto}`;
  document.getElementById('modal-confirm-recolector').textContent = recolector;
  document.getElementById('modal-confirm-comprador').textContent = comprador;

  const paymentBox = document.getElementById('modal-payment-section');
  if (pendiente > 0) {
    document.getElementById('modal-pendiente-monto').textContent = `S/ ${pendiente.toFixed(2)}`;
    document.getElementById('modal-cobro-input').value = pendiente.toFixed(2);
    paymentBox.classList.remove('hidden');
  } else {
    paymentBox.classList.add('hidden');
    document.getElementById('modal-cobro-input').value = '0';
  }

  document.getElementById('confirm-modal').classList.remove('hidden');
}

document.getElementById('btn-cancel-entrega').addEventListener('click', () => {
  document.getElementById('confirm-modal').classList.add('hidden');
  currentTicketForDelivery = null;
});

document.getElementById('btn-proceed-entrega').addEventListener('click', async () => {
  if (!currentTicketForDelivery) return;

  const cobroAdicional = parseFloat(document.getElementById('modal-cobro-input').value) || 0.0;
  const metodoPagoEntrega = document.getElementById('modal-cobro-metodo').value;

  try {
    const res = await fetch(`${API_BASE}/tickets/confirmar-entrega`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        numero_boleto: currentTicketForDelivery,
        monto_cobrado_adicional: cobroAdicional,
        metodo_pago_entrega: metodoPagoEntrega
      })
    });

    document.getElementById('confirm-modal').classList.add('hidden');

    if (res.ok) {
      showToast(`¡Entrega confirmada para el Boleto #${currentTicketForDelivery}!`, 'success');
      await searchTicketsForDelivery(currentTicketForDelivery);
      if (selectedEventId) loadDashboard(selectedEventId);
    } else {
      const err = await res.json();
      showToast(err.detail || 'Error al confirmar la entrega', 'error');
    }
  } catch (err) {
    showToast('Error de conexión con el servidor', 'error');
  }
});

// Pestañas de Navegación
document.querySelectorAll('[data-screen]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const screen = e.currentTarget.getAttribute('data-screen');
    switchScreen(screen);
  });
});

// =================== BOTONES DE REFRESCO ===================

// Refrescar Dashboard (KPIs + tabla)
document.getElementById('btn-refresh-dashboard').addEventListener('click', async () => {
  if (!selectedEventId) return;
  const btn = document.getElementById('btn-refresh-dashboard');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';
  await loadDashboard(selectedEventId);
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Actualizar';
  showToast('Dashboard actualizado', 'success');
});

// Limpiar / refrescar pantalla de Entrega
document.getElementById('btn-refresh-entrega').addEventListener('click', () => {
  document.getElementById('entrega-query').value = '';
  document.getElementById('entrega-results-container').innerHTML = '';
  showToast('Búsqueda limpiada', 'success');
});

// Limpiar / refrescar pantalla de Editar
document.getElementById('btn-refresh-editar').addEventListener('click', () => {
  document.getElementById('editar-query').value = '';
  document.getElementById('editar-results-container').innerHTML = '';
  showToast('Búsqueda limpiada', 'success');
});

// =================== IMPORTAR EXCEL / CSV ===================

// Abrir modal de importación y poblar eventos
document.getElementById('btn-import-open').addEventListener('click', async () => {
  // Reset state
  document.getElementById('import-result').classList.add('hidden');
  document.getElementById('import-error').classList.add('hidden');
  document.getElementById('import-replace-warning').classList.add('hidden');
  document.getElementById('import-file').value = '';
  document.getElementById('mode-merge').checked = true;

  // Poblar selector de eventos
  const sel = document.getElementById('import-evento-select');
  sel.innerHTML = '<option value="">Cargando...</option>';
  try {
    const res = await fetch(`${API_BASE}/eventos`, { headers: getHeaders() });
    const eventos = await res.json();
    sel.innerHTML = eventos.map(e =>
      `<option value="${e.id}" ${e.id == selectedEventId ? 'selected' : ''}>${e.nombre}</option>`
    ).join('');
  } catch {
    sel.innerHTML = '<option value="">Error al cargar eventos</option>';
  }

  document.getElementById('import-modal').classList.remove('hidden');
});

// Cerrar modal de importación
document.getElementById('btn-cancel-import').addEventListener('click', () => {
  document.getElementById('import-modal').classList.add('hidden');
});

// Toggle advertencia según modo seleccionado
document.querySelectorAll('input[name="import-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const warn = document.getElementById('import-replace-warning');
    if (document.getElementById('mode-replace').checked) {
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
  });
});

// Ejecutar importación
document.getElementById('btn-do-import').addEventListener('click', async () => {
  const eventoId  = document.getElementById('import-evento-select').value;
  const fileInput = document.getElementById('import-file');
  const modo      = document.querySelector('input[name="import-mode"]:checked').value;
  const resultBox = document.getElementById('import-result');
  const errorBox  = document.getElementById('import-error');
  const btn       = document.getElementById('btn-do-import');

  resultBox.classList.add('hidden');
  errorBox.classList.add('hidden');

  if (!eventoId) {
    errorBox.textContent = 'Selecciona un evento.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (!fileInput.files || fileInput.files.length === 0) {
    errorBox.textContent = 'Selecciona un archivo .xlsx o .csv.';
    errorBox.classList.remove('hidden');
    return;
  }

  // Confirmación extra para replace
  if (modo === 'replace') {
    const ok = confirm('⚠️ ATENCIÓN: Esto borrará TODOS los boletos del evento y los reemplazará con los del archivo.\n\n¿Deseas continuar?');
    if (!ok) return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importando...';

  const formData = new FormData();
  formData.append('evento_id', eventoId);
  formData.append('modo', modo);
  formData.append('archivo', fileInput.files[0]);

  try {
    const res = await fetch(`${API_BASE}/tickets/importar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // NO Content-Type (multipart)
      body: formData
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      resultBox.innerHTML = `
        <p style="color:var(--emerald);font-weight:700;margin-bottom:.4rem">
          <i class="fa-solid fa-circle-check"></i> ${data.mensaje}
        </p>
        <ul style="list-style:none;padding:0;color:var(--text-muted);font-size:.82rem;line-height:1.8">
          <li>📄 Filas en el archivo: <strong>${data.total_filas_archivo}</strong></li>
          <li>✅ Boletos creados: <strong style="color:var(--emerald)">${data.creados}</strong></li>
          <li>🔄 Boletos actualizados: <strong style="color:var(--cyan)">${data.actualizados}</strong></li>
          ${data.filas_invalidas > 0 ? `<li>⚠️ Filas inválidas (sin nº boleto): <strong style="color:var(--amber)">${data.filas_invalidas}</strong></li>` : ''}
        </ul>
      `;
      resultBox.classList.remove('hidden');
      fileInput.value = '';

      // Refrescar dashboard
      if (selectedEventId) await loadDashboard(selectedEventId);
      showToast('Importación completada', 'success');
    } else {
      const msg = Array.isArray(data.detail)
        ? data.detail.map(d => d.msg).join(', ')
        : (data.detail || 'Error desconocido al importar');
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
  } catch (err) {
    errorBox.textContent = 'Error de conexión con el servidor.';
    errorBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload"></i> Importar Ahora';
  }
});


// Búsqueda en pantalla Editar
document.getElementById('editar-search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('editar-query').value.trim();
  if (query) await searchTicketsForEdit(query);
});

async function searchTicketsForEdit(query) {
  try {
    const res = await fetch(`${API_BASE}/tickets/buscar?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
    if (res.ok) {
      const tickets = await res.json();
      renderEditResults(tickets);
    } else {
      showToast('Error al buscar boletos', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

function renderEditResults(tickets) {
  const container = document.getElementById('editar-results-container');
  container.innerHTML = '';

  if (tickets.length === 0) {
    container.innerHTML = '<div class="alert alert-warning text-center">No se encontraron boletos con ese criterio.</div>';
    return;
  }

  tickets.forEach(t => {
    const card = document.createElement('div');
    const estadoClass = `badge-${t.estado}`;
    const entregadoBadge = t.entregado
      ? '<span class="badge badge-entregado"><i class="fa-solid fa-check"></i> Entregado</span>'
      : '<span class="badge badge-separado"><i class="fa-solid fa-clock"></i> Pendiente</span>';

    card.className = 'glass-panel ticket-found-card';
    card.style.marginBottom = '1rem';
    card.innerHTML = `
      <div class="ticket-found-header">
        <h4>Boleto Físico <strong class="text-primary">#${t.numero_boleto}</strong></h4>
        <div>
          <span class="badge ${estadoClass}">${t.estado.replace('_', ' ')}</span>
          ${entregadoBadge}
        </div>
      </div>
      <div class="ticket-found-info" style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem .75rem;margin:.75rem 0;">
        <p><strong>Comprador:</strong> ${t.nombre_alumno}</p>
        <p><strong>Código / DNI:</strong> ${t.codigo_alumno}</p>
        <p><strong>Recoge:</strong> ${t.nombre_recolector || t.nombre_alumno}</p>
        <p><strong>Carrera:</strong> ${t.carrera} (${t.ciclo}°)</p>
        <p><strong>Precio:</strong> S/ ${t.precio_unitario.toFixed(2)}</p>
        <p><strong>Pagado:</strong> <span class="text-emerald">S/ ${t.monto_pagado.toFixed(2)}</span></p>
        <p><strong>Pendiente:</strong> <span class="${t.monto_pendiente > 0 ? 'text-rose font-bold' : ''}">S/ ${t.monto_pendiente.toFixed(2)}</span></p>
        <p><strong>Método:</strong> ${t.metodo_pago.toUpperCase()}</p>
      </div>
      <div class="ticket-found-actions">
        <button class="btn btn-primary btn-edit-open"
          data-id="${t.id}"
          data-num="${t.numero_boleto}"
          data-codigo="${t.codigo_alumno}"
          data-nombre="${t.nombre_alumno}"
          data-carrera="${t.carrera}"
          data-ciclo="${t.ciclo}"
          data-recolector="${t.nombre_recolector || ''}"
          data-estado="${t.estado}"
          data-precio="${t.precio_unitario}"
          data-pagado="${t.monto_pagado}"
          data-metodo="${t.metodo_pago}"
          data-entregado="${t.entregado}">
          <i class="fa-solid fa-pen-to-square"></i> Editar este Boleto
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Listeners de abrir modal
  document.querySelectorAll('.btn-edit-open').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const b = e.currentTarget;
      openEditModal({
        id:          b.dataset.id,
        numero:      b.dataset.num,
        codigo:      b.dataset.codigo,
        nombre:      b.dataset.nombre,
        carrera:     b.dataset.carrera,
        ciclo:       b.dataset.ciclo,
        recolector:  b.dataset.recolector,
        estado:      b.dataset.estado,
        precio:      b.dataset.precio,
        pagado:      b.dataset.pagado,
        metodo:      b.dataset.metodo,
        entregado:   b.dataset.entregado
      });
    });
  });
}

function openEditModal(data) {
  document.getElementById('edit-ticket-id').value        = data.id;
  document.getElementById('edit-modal-num').textContent  = `#${data.numero}`;
  document.getElementById('edit-codigo').value           = data.codigo;
  document.getElementById('edit-nombre').value           = data.nombre;
  document.getElementById('edit-carrera').value          = data.carrera;
  document.getElementById('edit-ciclo').value            = data.ciclo;
  document.getElementById('edit-recolector').value       = data.recolector;
  document.getElementById('edit-estado').value           = data.estado;
  document.getElementById('edit-precio').value           = parseFloat(data.precio).toFixed(2);
  document.getElementById('edit-monto-pagado').value     = parseFloat(data.pagado).toFixed(2);
  document.getElementById('edit-metodo-pago').value      = data.metodo;
  document.getElementById('edit-entregado').value        = data.entregado === 'true' ? 'true' : 'false';
  document.getElementById('edit-error-box').classList.add('hidden');
  document.getElementById('edit-modal').classList.remove('hidden');
}

// Cerrar modal de edición
document.getElementById('btn-cancel-edit').addEventListener('click', () => {
  document.getElementById('edit-modal').classList.add('hidden');
});

// Guardar cambios
document.getElementById('btn-save-edit').addEventListener('click', async () => {
  const ticketId = document.getElementById('edit-ticket-id').value;
  const errorBox = document.getElementById('edit-error-box');
  errorBox.classList.add('hidden');

  const payload = {
    codigo_alumno:    document.getElementById('edit-codigo').value.trim(),
    nombre_alumno:    document.getElementById('edit-nombre').value.trim(),
    carrera:          document.getElementById('edit-carrera').value.trim(),
    ciclo:            document.getElementById('edit-ciclo').value.trim(),
    nombre_recolector: document.getElementById('edit-recolector').value.trim(),
    estado:           document.getElementById('edit-estado').value,
    precio_unitario:  parseFloat(document.getElementById('edit-precio').value),
    monto_pagado:     parseFloat(document.getElementById('edit-monto-pagado').value),
    metodo_pago:      document.getElementById('edit-metodo-pago').value,
    entregado:        document.getElementById('edit-entregado').value === 'true'
  };

  // Validaciones básicas
  if (!payload.nombre_alumno) {
    errorBox.textContent = 'El nombre del comprador no puede estar vacío.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (isNaN(payload.precio_unitario) || payload.precio_unitario <= 0) {
    errorBox.textContent = 'El precio unitario debe ser mayor a 0.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (isNaN(payload.monto_pagado) || payload.monto_pagado < 0) {
    errorBox.textContent = 'El monto pagado no puede ser negativo.';
    errorBox.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('btn-save-edit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  try {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      document.getElementById('edit-modal').classList.add('hidden');
      showToast('¡Boleto actualizado correctamente!', 'success');
      // Refrescar resultados con el mismo query
      const query = document.getElementById('editar-query').value.trim();
      if (query) await searchTicketsForEdit(query);
      // Refrescar dashboard si está activo
      if (selectedEventId) loadDashboard(selectedEventId);
    } else {
      const err = await res.json();
      const msg = Array.isArray(err.detail)
        ? err.detail.map(d => d.msg).join(', ')
        : (err.detail || 'Error al guardar cambios');
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
  } catch (err) {
    errorBox.textContent = 'Error de conexión con el servidor.';
    errorBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
  }
});

// Inicialización de la app
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
