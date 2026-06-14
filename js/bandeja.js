// ══════════════════════════════════════════
//  bandeja.js — Sistema de notificaciones CDC
// ══════════════════════════════════════════
import { db } from './firebase-config.js';
import {
  collection, query, orderBy, onSnapshot, doc,
  addDoc, updateDoc, deleteDoc, getDocs, where,
  serverTimestamp, getDoc, limit
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const MAX_MENSAJES = 30;
let _uid = null;
let _esAdmin = false;
let _unsubBandeja = null;

// ── CSS ──────────────────────────────────
const BANDEJA_CSS = `
  .bandeja-btn{position:relative;width:34px;height:34px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(226,221,214,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:all 0.2s;flex-shrink:0;}
  .bandeja-btn:hover{border-color:rgba(192,57,43,0.5);color:#e2ddd6;}
  .bandeja-badge{position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;background:#c0392b;color:#fff;font-size:9px;font-weight:700;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;pointer-events:none;font-family:'Raleway',sans-serif;}
  .bandeja-badge.llena{background:#e67e22;}
  .bandeja-overlay{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.5);display:none;}
  .bandeja-overlay.open{display:block;}
  .bandeja-panel{position:fixed;top:0;right:0;bottom:0;width:360px;max-width:95vw;z-index:901;background:#0d1117;border-left:1px solid rgba(192,57,43,0.2);display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);}
  .bandeja-panel.open{transform:translateX(0);}
  .bandeja-header{padding:16px 18px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;flex-shrink:0;}
  .bandeja-titulo{font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#e2ddd6;flex:1;letter-spacing:0.08em;}
  .bandeja-close{background:transparent;border:none;color:rgba(226,221,214,0.4);cursor:pointer;font-size:18px;padding:2px;transition:color 0.15s;}
  .bandeja-close:hover{color:#e2ddd6;}
  .bandeja-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;}
  .bandeja-tab{flex:1;padding:10px 4px;background:transparent;border:none;border-bottom:2px solid transparent;color:rgba(226,221,214,0.4);font-family:'Raleway',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;margin-bottom:-1px;}
  .bandeja-tab.active{color:#e2ddd6;border-bottom-color:#c0392b;}
  .bandeja-acciones{padding:8px 14px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;gap:8px;flex-shrink:0;}
  .bandeja-act-btn{padding:4px 10px;background:transparent;border:1px solid rgba(255,255,255,0.1);color:rgba(226,221,214,0.5);font-family:'Raleway',sans-serif;font-size:10px;font-weight:600;letter-spacing:0.08em;cursor:pointer;transition:all 0.15s;}
  .bandeja-act-btn:hover{border-color:rgba(192,57,43,0.4);color:#e2ddd6;}
  .bandeja-act-btn.danger{border-color:rgba(192,57,43,0.3);color:rgba(192,57,43,0.7);}
  .bandeja-act-btn.danger:hover{background:rgba(192,57,43,0.1);color:#c0392b;}
  .bandeja-llena-banner{padding:10px 14px;background:rgba(192,57,43,0.12);border-bottom:1px solid rgba(192,57,43,0.25);font-size:11px;color:#e08070;display:none;flex-shrink:0;}
  .bandeja-llena-banner.visible{display:block;}
  .bandeja-lista{flex:1;overflow-y:auto;padding:0;}
  .bandeja-lista::-webkit-scrollbar{width:4px;}
  .bandeja-lista::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);}
  .bandeja-item{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s;position:relative;display:flex;gap:10px;align-items:flex-start;}
  .bandeja-item:hover{background:rgba(255,255,255,0.02);}
  .bandeja-item.no-leido{background:rgba(192,57,43,0.04);}
  .bandeja-item.no-leido::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#c0392b;}
  .bandeja-item-icon{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;margin-top:2px;}
  .bandeja-item-icon.sistema{background:rgba(52,152,219,0.15);color:#3498db;}
  .bandeja-item-icon.mensaje{background:rgba(46,204,113,0.15);color:#2ecc71;}
  .bandeja-item-icon.solicitud{background:rgba(201,168,76,0.15);color:#c9a84c;}
  .bandeja-item-body{flex:1;min-width:0;}
  .bandeja-item-titulo{font-size:12px;font-weight:600;color:#e2ddd6;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .bandeja-item-texto{font-size:11px;color:rgba(226,221,214,0.5);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
  .bandeja-item-fecha{font-size:9px;color:rgba(226,221,214,0.3);margin-top:4px;font-family:'Raleway',sans-serif;}
  .bandeja-item-del{background:transparent;border:none;color:rgba(226,221,214,0.2);cursor:pointer;font-size:13px;padding:2px 4px;transition:color 0.15s;flex-shrink:0;align-self:center;}
  .bandeja-item-del:hover{color:#c0392b;}
  .bandeja-vacio{padding:40px 20px;text-align:center;color:rgba(226,221,214,0.3);font-size:12px;font-style:italic;}
  .bandeja-compose{padding:12px 16px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;}
  .bandeja-compose-btn{width:100%;height:36px;background:transparent;border:1px solid rgba(192,57,43,0.3);color:rgba(192,57,43,0.8);font-family:'Cinzel',serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;}
  .bandeja-compose-btn:hover{background:rgba(192,57,43,0.1);color:#c0392b;}
  /* Modal nuevo mensaje */
  .bandeja-modal{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.75);display:none;align-items:center;justify-content:center;}
  .bandeja-modal.open{display:flex;}
  .bandeja-modal-box{background:#0d1117;border:1px solid rgba(192,57,43,0.3);width:360px;max-width:95vw;padding:0;}
  .bandeja-modal-header{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;}
  .bandeja-modal-titulo{font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#e2ddd6;}
  .bandeja-modal-body{padding:16px;}
  .bandeja-form-label{font-family:'Raleway',sans-serif;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(226,221,214,0.4);display:block;margin-bottom:6px;}
  .bandeja-form-input{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#e2ddd6;font-family:'Raleway',sans-serif;font-size:13px;padding:8px 10px;outline:none;margin-bottom:12px;transition:border-color 0.2s;}
  .bandeja-form-input:focus{border-color:rgba(192,57,43,0.4);}
  .bandeja-form-textarea{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#e2ddd6;font-family:'Raleway',sans-serif;font-size:13px;padding:8px 10px;outline:none;resize:vertical;min-height:90px;margin-bottom:4px;transition:border-color 0.2s;}
  .bandeja-form-textarea:focus{border-color:rgba(192,57,43,0.4);}
  .bandeja-char-count{font-size:10px;color:rgba(226,221,214,0.3);text-align:right;margin-bottom:12px;}
  .bandeja-form-adjunto{padding:8px 10px;border:1px dashed rgba(255,255,255,0.1);color:rgba(226,221,214,0.3);font-size:11px;text-align:center;margin-bottom:12px;cursor:not-allowed;opacity:0.5;}
  /* Autocomplete destinatario */
  .bandeja-dest-wrap{position:relative;margin-bottom:12px;}
  .bandeja-dest-input{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#e2ddd6;font-family:'Raleway',sans-serif;font-size:13px;padding:8px 10px;outline:none;transition:border-color 0.2s;box-sizing:border-box;}
  .bandeja-dest-input:focus{border-color:rgba(192,57,43,0.4);}
  .bandeja-dest-input.valido{border-color:rgba(46,204,113,0.5);background:rgba(46,204,113,0.04);}
  .bandeja-dest-input.invalido{border-color:rgba(192,57,43,0.6);background:rgba(192,57,43,0.04);}
  .bandeja-dest-sugerencias{position:absolute;top:100%;left:0;right:0;background:#16161e;border:1px solid rgba(255,255,255,0.1);border-top:2px solid #c0392b;z-index:1000;max-height:160px;overflow-y:auto;display:none;}
  .bandeja-dest-sugerencias.visible{display:block;}
  .bandeja-dest-item{padding:8px 12px;font-family:'Raleway',sans-serif;font-size:13px;color:#b0aab8;cursor:pointer;transition:background 0.15s;}
  .bandeja-dest-item:hover{background:rgba(192,57,43,0.1);color:#e8e2d9;}
  .bandeja-dest-hint{font-size:10px;color:rgba(226,221,214,0.3);margin-top:4px;margin-bottom:12px;min-height:14px;}
  .bandeja-btn-enviar{width:100%;height:36px;background:#c0392b;border:none;color:#fff;font-family:'Cinzel',serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:background 0.2s;}
  .bandeja-btn-enviar:hover{background:#e74c3c;}
  /* Vista detalle mensaje */
  .bandeja-detalle{position:absolute;inset:0;background:#0d1117;z-index:10;display:none;flex-direction:column;}
  .bandeja-detalle.open{display:flex;}
  .bandeja-detalle-header{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;flex-shrink:0;}
  .bandeja-back{background:transparent;border:none;color:rgba(226,221,214,0.5);cursor:pointer;font-size:16px;padding:2px;transition:color 0.15s;}
  .bandeja-back:hover{color:#e2ddd6;}
  .bandeja-detalle-titulo{font-family:'Cinzel',serif;font-size:12px;font-weight:700;color:#e2ddd6;flex:1;}
  .bandeja-detalle-meta{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);}
  .bandeja-detalle-de{font-size:11px;color:rgba(226,221,214,0.4);margin-bottom:4px;}
  .bandeja-detalle-fecha{font-size:10px;color:rgba(226,221,214,0.25);}
  .bandeja-detalle-cuerpo{flex:1;overflow-y:auto;padding:16px;font-size:13px;color:rgba(226,221,214,0.8);line-height:1.7;}
  .bandeja-detalle-acciones{padding:12px 16px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:8px;flex-shrink:0;}
  .bandeja-resp-btn{flex:1;height:34px;background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);color:#c0392b;font-family:'Cinzel',serif;font-size:10px;font-weight:700;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;}
  .bandeja-resp-btn:hover{background:rgba(192,57,43,0.25);}
  .bandeja-del-btn{height:34px;padding:0 12px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(226,221,214,0.3);font-size:13px;cursor:pointer;transition:all 0.15s;}
  .bandeja-del-btn:hover{border-color:rgba(192,57,43,0.4);color:#c0392b;}
`;

// ── HTML ─────────────────────────────────
function crearHTML() {
  return `
  <style>${BANDEJA_CSS}</style>
  <div class="bandeja-overlay" id="bandeja-overlay" onclick="cerrarBandeja()"></div>
  <div class="bandeja-panel" id="bandeja-panel">
    <div class="bandeja-header">
      <i class="ri-inbox-line" style="color:#c0392b;font-size:16px;"></i>
      <span class="bandeja-titulo">Bandeja de Entrada</span>
      <button class="bandeja-close" onclick="cerrarBandeja()">✕</button>
    </div>
    <div class="bandeja-tabs">
      <button class="bandeja-tab active" onclick="switchBandejaTab('todo',this)">Todo</button>
      <button class="bandeja-tab" onclick="switchBandejaTab('mensajes',this)">Mensajes</button>
      <button class="bandeja-tab" onclick="switchBandejaTab('sistema',this)">Sistema</button>
    </div>
    <div class="bandeja-acciones">
      <button class="bandeja-act-btn" onclick="marcarTodoLeido()">✓ Marcar leídos</button>
      <button class="bandeja-act-btn danger" onclick="eliminarLeidos()">✕ Eliminar leídos</button>
    </div>
    <div class="bandeja-llena-banner" id="bandeja-llena-banner">
      ⚠️ Bandeja llena — elimina mensajes para recibir nuevos.
    </div>
    <div class="bandeja-lista" id="bandeja-lista"></div>
    <div class="bandeja-compose">
      <button class="bandeja-compose-btn" onclick="abrirCompose()">
        <i class="ri-edit-line"></i> Nuevo Mensaje
      </button>
    </div>
    <!-- Vista detalle -->
    <div class="bandeja-detalle" id="bandeja-detalle">
      <div class="bandeja-detalle-header">
        <button class="bandeja-back" onclick="cerrarDetalle()"><i class="ri-arrow-left-line"></i></button>
        <span class="bandeja-detalle-titulo" id="det-titulo">—</span>
        <button class="bandeja-del-btn" onclick="eliminarMensajeActual()" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
      </div>
      <div class="bandeja-detalle-meta">
        <div class="bandeja-detalle-de" id="det-de">—</div>
        <div class="bandeja-detalle-fecha" id="det-fecha">—</div>
      </div>
      <div class="bandeja-detalle-cuerpo" id="det-cuerpo">—</div>
      <div class="bandeja-detalle-acciones" id="det-acciones"></div>
    </div>
  </div>
  <!-- Modal compose -->
  <div class="bandeja-modal" id="bandeja-modal-compose">
    <div class="bandeja-modal-box">
      <div class="bandeja-modal-header">
        <span class="bandeja-modal-titulo"><i class="ri-edit-line"></i> Nuevo Mensaje</span>
        <button class="bandeja-close" onclick="cerrarCompose()">✕</button>
      </div>
      <div class="bandeja-modal-body">
        <label class="bandeja-form-label">Para</label>
        <div class="bandeja-dest-wrap">
          <input id="bandeja-destinatario-input" class="bandeja-dest-input" type="text"
            placeholder="Escribe el nombre del cazador..." autocomplete="off"
            oninput="buscarDestinatario(this.value)">
          <div class="bandeja-dest-sugerencias" id="bandeja-dest-sugerencias"></div>
        </div>
        <div class="bandeja-dest-hint" id="bandeja-dest-hint"></div>
        <input type="hidden" id="bandeja-destinatario-uid">
        <input type="hidden" id="bandeja-destinatario-nombre">
        <label class="bandeja-form-label">Asunto</label>
        <input id="bandeja-asunto" class="bandeja-form-input" type="text" maxlength="60" placeholder="Asunto del mensaje...">
        <label class="bandeja-form-label">Mensaje</label>
        <textarea id="bandeja-cuerpo" class="bandeja-form-textarea" maxlength="500" placeholder="Escribe tu mensaje..." oninput="document.getElementById('bandeja-char-count').textContent=this.value.length+'/500'"></textarea>
        <div class="bandeja-char-count" id="bandeja-char-count">0/500</div>
        <div class="bandeja-form-adjunto" title="Disponible próximamente">
          <i class="ri-attachment-line"></i> Adjuntar ítem — próximamente
        </div>
        <button class="bandeja-btn-enviar" onclick="enviarMensaje()">
          <i class="ri-send-plane-line"></i> Enviar
        </button>
      </div>
    </div>
  </div>
  `;
}

// ── ESTADO ───────────────────────────────
let _mensajes = [];
let _tabActiva = 'todo';
let _mensajeActualId = null;

// ── INIT ─────────────────────────────────
export async function initBandeja(uid, esAdmin = false) {
  _uid = uid;
  _esAdmin = esAdmin;

  // Inyectar HTML
  const container = document.createElement('div');
  container.innerHTML = crearHTML();
  document.body.appendChild(container);

  // Escuchar notificaciones en tiempo real
  const q = query(
    collection(db, 'usuarios', uid, 'notificaciones'),
    orderBy('fecha', 'desc')
  );
  _unsubBandeja = onSnapshot(q, snap => {
    _mensajes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    actualizarBadge();
    if (document.getElementById('bandeja-panel')?.classList.contains('open')) {
      renderLista();
    }
  });
}

// ── BADGE ────────────────────────────────
function actualizarBadge() {
  const btn = document.getElementById('bandeja-btn');
  if (!btn) return;
  const noLeidos = _mensajes.filter(m => !m.leido).length;
  const total = _mensajes.filter(m => m.tipo !== 'sistema').length;
  const llena = !_esAdmin && total >= MAX_MENSAJES;
  let badge = btn.querySelector('.bandeja-badge');
  if (!badge) { badge = document.createElement('span'); badge.className = 'bandeja-badge'; btn.appendChild(badge); }
  if (noLeidos > 0) {
    badge.textContent = noLeidos > 99 ? '99+' : noLeidos;
    badge.style.display = 'flex';
    badge.className = 'bandeja-badge' + (llena ? ' llena' : '');
  } else if (llena) {
    badge.textContent = '⚠';
    badge.style.display = 'flex';
    badge.className = 'bandeja-badge llena';
  } else {
    badge.style.display = 'none';
  }
}

// ── ABRIR / CERRAR ───────────────────────
window.abrirBandeja = function() {
  document.getElementById('bandeja-panel').classList.add('open');
  document.getElementById('bandeja-overlay').classList.add('open');
  renderLista();
};
window.cerrarBandeja = function() {
  document.getElementById('bandeja-panel').classList.remove('open');
  document.getElementById('bandeja-overlay').classList.remove('open');
};
window.switchBandejaTab = function(tab, el) {
  _tabActiva = tab;
  document.querySelectorAll('.bandeja-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderLista();
};

// ── RENDER LISTA ─────────────────────────
function renderLista() {
  const lista = document.getElementById('bandeja-lista');
  const banner = document.getElementById('bandeja-llena-banner');
  const totalMsgs = _mensajes.filter(m => m.tipo !== 'sistema').length;
  const llena = !_esAdmin && totalMsgs >= MAX_MENSAJES;
  if (banner) banner.classList.toggle('visible', llena);

  let filtrados = _mensajes;
  if (_tabActiva === 'mensajes') filtrados = _mensajes.filter(m => m.tipo === 'mensaje');
  if (_tabActiva === 'sistema') filtrados = _mensajes.filter(m => m.tipo === 'sistema' || m.tipo === 'solicitud_director');

  if (!filtrados.length) {
    lista.innerHTML = '<div class="bandeja-vacio">Sin mensajes</div>';
    return;
  }

  const iconos = { sistema: 'ri-notification-3-line', mensaje: 'ri-chat-3-line', solicitud_director: 'ri-medal-line' };
  const tipos  = { sistema: 'sistema', mensaje: 'mensaje', solicitud_director: 'solicitud' };

  lista.innerHTML = filtrados.map(m => {
    const ico = iconos[m.tipo] || 'ri-mail-line';
    const cls = tipos[m.tipo] || 'sistema';
    const fecha = m.fecha?.toDate ? formatFecha(m.fecha.toDate()) : '';
    return `<div class="bandeja-item ${m.leido ? '' : 'no-leido'}" onclick="abrirDetalle('${m.id}')">
      <div class="bandeja-item-icon ${cls}"><i class="${ico}"></i></div>
      <div class="bandeja-item-body">
        <div class="bandeja-item-titulo">${m.titulo || '(Sin asunto)'}</div>
        <div class="bandeja-item-texto">${m.texto || ''}</div>
        <div class="bandeja-item-fecha">${m.deNombre ? 'De: ' + m.deNombre + ' · ' : ''}${fecha}</div>
      </div>
      <button class="bandeja-item-del" onclick="event.stopPropagation();eliminarNoti('${m.id}')" title="Eliminar"><i class="ri-close-line"></i></button>
    </div>`;
  }).join('');
}

// ── DETALLE ──────────────────────────────
window.abrirDetalle = async function(id) {
  const m = _mensajes.find(x => x.id === id);
  if (!m) return;
  _mensajeActualId = id;
  document.getElementById('det-titulo').textContent = m.titulo || '(Sin asunto)';
  document.getElementById('det-de').textContent = m.deNombre ? 'De: ' + m.deNombre : 'Sistema CDC';
  document.getElementById('det-fecha').textContent = m.fecha?.toDate ? formatFecha(m.fecha.toDate()) : '';
  document.getElementById('det-cuerpo').textContent = m.texto || '';
  // Acciones — solo mensajes de otros usuarios tienen responder
  const acc = document.getElementById('det-acciones');
  if (m.tipo === 'mensaje' && m.deUid && m.deUid !== _uid) {
    acc.innerHTML = `<button class="bandeja-resp-btn" onclick="responderMensaje('${m.deUid}','${(m.deNombre||'').replace(/'/g,"\\'")}')"><i class="ri-reply-line"></i> Responder</button>`;
  } else { acc.innerHTML = ''; }
  document.getElementById('bandeja-detalle').classList.add('open');
  // Marcar leído
  if (!m.leido) {
    await updateDoc(doc(db, 'usuarios', _uid, 'notificaciones', id), { leido: true });
  }
};
window.cerrarDetalle = function() {
  document.getElementById('bandeja-detalle').classList.remove('open');
  _mensajeActualId = null;
};
window.eliminarMensajeActual = async function() {
  if (!_mensajeActualId) return;
  await eliminarNoti(_mensajeActualId);
  cerrarDetalle();
};

// ── COMPOSE ──────────────────────────────
window.abrirCompose = async function(destinatarioUid = '', destinatarioNombre = '') {
  // Limpiar campos
  const inputDest  = document.getElementById('bandeja-destinatario-input');
  const hiddenUid  = document.getElementById('bandeja-destinatario-uid');
  const hiddenNom  = document.getElementById('bandeja-destinatario-nombre');
  const hint       = document.getElementById('bandeja-dest-hint');

  inputDest.value = destinatarioNombre || '';
  hiddenUid.value = destinatarioUid || '';
  hiddenNom.value = destinatarioNombre || '';
  hint.textContent = '';
  inputDest.className = 'bandeja-dest-input' + (destinatarioUid ? ' valido' : '');
  document.getElementById('bandeja-dest-sugerencias').classList.remove('visible');
  document.getElementById('bandeja-asunto').value = '';
  document.getElementById('bandeja-cuerpo').value = '';
  document.getElementById('bandeja-char-count').textContent = '0/500';
  document.getElementById('bandeja-modal-compose').classList.add('open');
};
window.cerrarCompose = function() {
  document.getElementById('bandeja-modal-compose').classList.remove('open');
};
window.responderMensaje = function(uid, nombre) {
  cerrarDetalle();
  abrirCompose(uid, nombre);
};

// ── AUTOCOMPLETE DESTINATARIO ─────────────
let _buscarTimeout = null;
window.buscarDestinatario = function(valor) {
  const input    = document.getElementById('bandeja-destinatario-input');
  const lista    = document.getElementById('bandeja-dest-sugerencias');
  const hint     = document.getElementById('bandeja-dest-hint');
  const hiddenUid = document.getElementById('bandeja-destinatario-uid');
  const hiddenNom = document.getElementById('bandeja-destinatario-nombre');

  // Limpiar selección previa al escribir
  hiddenUid.value = '';
  hiddenNom.value = '';
  input.classList.remove('valido', 'invalido');
  hint.textContent = '';
  lista.classList.remove('visible');
  lista.innerHTML = '';

  const texto = valor.trim().toLowerCase();
  if (texto.length < 2) return;

  clearTimeout(_buscarTimeout);
  _buscarTimeout = setTimeout(async () => {
    try {
      // Búsqueda por prefijo en nombreLower (case-insensitive)
      const q = query(
        collection(db, 'usuarios'),
        where('nombreLower', '>=', texto),
        where('nombreLower', '<=', texto + '\uf8ff'),
        limit(8)
      );
      const snap = await getDocs(q);
      const resultados = snap.docs.filter(d => d.id !== _uid);

      if (resultados.length === 0) {
        hint.style.color = '#e57373';
        hint.textContent = 'No se encontraron cazadores con ese nombre.';
        return;
      }

      lista.innerHTML = resultados.map(d => {
        const nombre = d.data().nombre || d.data().displayName || d.id;
        return `<div class="bandeja-dest-item" onclick="seleccionarDestinatario('${d.id}', '${nombre.replace(/'/g, "\\'")}')">
          <i class="ri-user-line" style="font-size:12px;margin-right:6px;color:#c0392b;"></i>${nombre}
        </div>`;
      }).join('');
      lista.classList.add('visible');

    } catch(e) {
      hint.style.color = '#e57373';
      hint.textContent = 'Error al buscar. Intenta de nuevo.';
    }
  }, 300);
};

window.seleccionarDestinatario = function(uid, nombre) {
  document.getElementById('bandeja-destinatario-input').value = nombre;
  document.getElementById('bandeja-destinatario-input').classList.add('valido');
  document.getElementById('bandeja-destinatario-uid').value = uid;
  document.getElementById('bandeja-destinatario-nombre').value = nombre;
  document.getElementById('bandeja-dest-sugerencias').classList.remove('visible');
  document.getElementById('bandeja-dest-sugerencias').innerHTML = '';
  document.getElementById('bandeja-dest-hint').textContent = '';
};

// Cerrar sugerencias al hacer click fuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.bandeja-dest-wrap')) {
    const lista = document.getElementById('bandeja-dest-sugerencias');
    if (lista) lista.classList.remove('visible');
  }
});

window.enviarMensaje = async function() {
  const destUid   = document.getElementById('bandeja-destinatario-uid').value;
  const destNombre = document.getElementById('bandeja-destinatario-nombre').value;
  const asunto    = document.getElementById('bandeja-asunto').value.trim();
  const cuerpo    = document.getElementById('bandeja-cuerpo').value.trim();
  const hint      = document.getElementById('bandeja-dest-hint');
  const inputDest = document.getElementById('bandeja-destinatario-input');

  if (!destUid) {
    inputDest.classList.add('invalido');
    hint.style.color = '#e57373';
    hint.textContent = !inputDest.value.trim()
      ? 'Debes indicar un destinatario.'
      : 'Este nombre de usuario no existe en nuestro sistema.';
    return;
  }
  if (!cuerpo) { alert('El mensaje no puede estar vacío.'); return; }

  // Verificar bandeja del destinatario
  if (!_esAdmin) {
    const destSnap = await getDocs(query(
      collection(db, 'usuarios', destUid, 'notificaciones'),
      where('tipo', '!=', 'sistema')
    ));
    if (destSnap.size >= MAX_MENSAJES) {
      alert(`La bandeja de ${destNombre} está llena. No se puede enviar el mensaje.`);
      return;
    }
  }

  // Obtener nombre del remitente
  const miSnap = await getDoc(doc(db, 'usuarios', _uid));
  const miNombre = miSnap.data()?.nombre || miSnap.data()?.displayName || 'Cazador';

  await addDoc(collection(db, 'usuarios', destUid, 'notificaciones'), {
    tipo: 'mensaje',
    titulo: asunto || '(Sin asunto)',
    texto: cuerpo,
    leido: false,
    fecha: serverTimestamp(),
    deUid: _uid,
    deNombre: miNombre,
    adjunto: null,
  });
  cerrarCompose();
  mostrarToastBandeja('Mensaje enviado.');
};

// ── ACCIONES MASIVAS ─────────────────────
window.marcarTodoLeido = async function() {
  const noLeidos = _mensajes.filter(m => !m.leido);
  await Promise.all(noLeidos.map(m =>
    updateDoc(doc(db, 'usuarios', _uid, 'notificaciones', m.id), { leido: true })
  ));
};
window.eliminarLeidos = async function() {
  const leidos = _mensajes.filter(m => m.leido);
  await Promise.all(leidos.map(m =>
    deleteDoc(doc(db, 'usuarios', _uid, 'notificaciones', m.id))
  ));
};
window.eliminarNoti = async function(id) {
  await deleteDoc(doc(db, 'usuarios', _uid, 'notificaciones', id));
};

// ── ENVIAR NOTIFICACIÓN DEL SISTEMA ──────
export async function notificarUsuario(uid, titulo, texto, tipo = 'sistema') {
  await addDoc(collection(db, 'usuarios', uid, 'notificaciones'), {
    tipo,
    titulo,
    texto,
    leido: false,
    fecha: serverTimestamp(),
    deUid: null,
    deNombre: null,
    adjunto: null,
  });
}

// ── HELPERS ──────────────────────────────
function formatFecha(date) {
  const ahora = new Date();
  const diff = ahora - date;
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' h';
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function mostrarToastBandeja(msg) {
  if (window.toast) { window.toast(msg, 'success'); return; }
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2ecc71;color:#fff;padding:8px 18px;font-size:12px;font-family:Raleway,sans-serif;z-index:9999;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
