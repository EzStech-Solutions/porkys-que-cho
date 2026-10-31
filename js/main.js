// Porky's ¡Qué Cho! — comportamiento de la página
const WHATSAPP = '573163500637';
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const redondear = (n) => Math.round(n * 100) / 100;
const num = (n) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
const pesos = (n) => '$' + Math.round(n).toLocaleString('es-CO');

// Año del pie de página
$('#anio').textContent = new Date().getFullYear();

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Productos y pedido ---------- */
const productos = new Map();
$$('[data-producto]').forEach((el) => {
  const d = el.dataset;
  const paso = Number(d.paso) || 1;
  productos.set(d.id, {
    id: d.id, nombre: d.nombre, precio: Number(d.precio), unidad: d.unidad || 'lb',
    paso, inicio: Number(d.inicio) || paso, el,
  });
});

const CLAVE = 'porkys-pedido';
let pedido = {};
try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}');
  Object.entries(guardado).forEach(([id, q]) => { if (productos.has(id) && q > 0) pedido[id] = Number(q); });
} catch (e) { /* sin almacenamiento: el pedido vive solo en esta visita */ }
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(pedido)); } catch (e) { /* ignorar */ } };

const lineasPedido = () => Object.entries(pedido).map(([id, cant]) => ({ p: productos.get(id), cant }));
const totalPedido = () => lineasPedido().reduce((s, { p, cant }) => s + Math.round(p.precio * cant), 0);
const cantidadItems = () => Object.keys(pedido).length;

/* ---------- Controles de cantidad ---------- */
const controles = [];   // { id, agregar, paso, entrada }

function crearPaso(p, compacto) {
  const caja = document.createElement('div');
  caja.className = 'paso-cantidad' + (compacto ? ' paso-cantidad--compacto' : '');
  const menos = document.createElement('button');
  menos.type = 'button'; menos.className = 'paso-btn'; menos.textContent = '−';
  menos.setAttribute('aria-label', `Quitar ${num(p.paso)} ${p.unidad} de ${p.nombre}`);
  const entrada = document.createElement('input');
  entrada.type = 'number'; entrada.min = '0'; entrada.step = String(p.paso); entrada.inputMode = 'decimal';
  entrada.setAttribute('aria-label', `Cantidad de ${p.nombre} en ${p.unidad}`);
  const mas = document.createElement('button');
  mas.type = 'button'; mas.className = 'paso-btn'; mas.textContent = '+';
  mas.setAttribute('aria-label', `Agregar ${num(p.paso)} ${p.unidad} de ${p.nombre}`);
  menos.addEventListener('click', () => cambiar(p.id, (pedido[p.id] || 0) - p.paso));
  mas.addEventListener('click', () => cambiar(p.id, (pedido[p.id] || 0) + p.paso));
  entrada.addEventListener('change', () => cambiar(p.id, Number(entrada.value) || 0));
  caja.append(menos, entrada, mas);
  return { caja, entrada };
}

function crearControl(p, compacto) {
  const caja = document.createElement('div');
  caja.className = 'cantidad';
  const agregar = document.createElement('button');
  agregar.type = 'button';
  agregar.className = 'btn btn-wa btn-peq btn-agregar';
  agregar.textContent = 'Agregar';
  agregar.setAttribute('aria-label', `Agregar ${p.nombre} al pedido`);
  agregar.addEventListener('click', () => cambiar(p.id, p.inicio));
  const { caja: paso, entrada } = crearPaso(p, compacto);
  caja.append(agregar, paso);
  controles.push({ id: p.id, agregar, paso, entrada });
  return caja;
}

productos.forEach((p) => {
  const compacto = p.el.tagName === 'LI';
  const control = crearControl(p, compacto);
  const enlace = $('a.btn-wa', p.el);      // enlace directo a WhatsApp (respaldo sin JavaScript)
  if (enlace) enlace.replaceWith(control); else p.el.append(control);
});

/* ---------- Ventana "Mi pedido" ---------- */
const dialogo = $('#dialogo-pedido');
const lista = $('#lineas');
const filas = new Map();   // id -> { li, info, pago, entrada }

function filaNueva(p) {
  const li = document.createElement('li');
  li.className = 'linea';
  const info = document.createElement('div');
  info.className = 'linea-info';
  const nombre = document.createElement('b'); nombre.textContent = p.nombre;
  const detalle = document.createElement('span');
  info.append(nombre, detalle);
  const pago = document.createElement('div'); pago.className = 'linea-pago';
  const acciones = document.createElement('div'); acciones.className = 'linea-acciones';
  const { caja, entrada } = crearPaso(p, true);
  const quitar = document.createElement('button');
  quitar.type = 'button'; quitar.className = 'quitar'; quitar.textContent = 'Quitar';
  quitar.setAttribute('aria-label', `Quitar ${p.nombre} del pedido`);
  quitar.addEventListener('click', () => cambiar(p.id, 0));
  acciones.append(caja, quitar);
  li.append(info, pago, acciones);
  return { li, detalle, pago, entrada };
}

function pintarFilas() {
  filas.forEach((f, id) => { if (!pedido[id]) { f.li.remove(); filas.delete(id); } });
  lineasPedido().forEach(({ p, cant }) => {
    let f = filas.get(p.id);
    if (!f) { f = filaNueva(p); filas.set(p.id, f); }
    lista.append(f.li);   // mantiene el orden del pedido
    f.detalle.textContent = `${num(cant)} ${p.unidad} × ${pesos(p.precio)}`;
    f.pago.textContent = pesos(p.precio * cant);
    if (document.activeElement !== f.entrada) f.entrada.value = num(cant).replace(/\./g, '').replace(',', '.');
  });
}

const barra = $('#barra-pedido');
const btnPedido = $('#btn-pedido');
const insignia = document.createElement('span');
insignia.className = 'insignia';
insignia.setAttribute('aria-hidden', 'true');
if (btnPedido) { btnPedido.textContent = 'Mi pedido '; btnPedido.append(insignia); }

function pintar() {
  controles.forEach((c) => {
    const q = pedido[c.id] || 0;
    c.agregar.hidden = q > 0;
    c.paso.hidden = q === 0;
    if (q > 0 && document.activeElement !== c.entrada) c.entrada.value = num(q).replace(/\./g, '').replace(',', '.');
  });
  const n = cantidadItems();
  const total = totalPedido();
  document.body.classList.toggle('con-pedido', n > 0);
  insignia.textContent = String(n);
  insignia.hidden = n === 0;
  barra.hidden = n === 0;
  $('#barra-texto').textContent = `${n} ${n === 1 ? 'producto' : 'productos'} · ${pesos(total)}`;
  $('#total').textContent = pesos(total);
  $('#vacio').hidden = n > 0;
  $('#resumen').hidden = n === 0;
  $('#enviar').disabled = n === 0;
  pintarFilas();
}

function cambiar(id, cantidad) {
  const q = Math.max(0, redondear(cantidad));
  if (q === 0) delete pedido[id]; else pedido[id] = q;
  guardar();
  pintar();
}

function abrirPedido(e) {
  if (e) e.preventDefault();
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
}
btnPedido?.addEventListener('click', abrirPedido);
$('#barra-abrir')?.addEventListener('click', abrirPedido);
$$('[data-cerrar]', dialogo).forEach((b) => b.addEventListener('click', () => dialogo.close()));
dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });

$('#vaciar').addEventListener('click', () => {
  if (cantidadItems() && window.confirm('¿Vaciar todo el pedido?')) { pedido = {}; guardar(); pintar(); }
});

function mensaje() {
  const lineas = lineasPedido().map(({ p, cant }) => `• ${p.nombre}: ${num(cant)} ${p.unidad} (${pesos(p.precio * cant)})`);
  const partes = ['Hola Porky\'s, quiero hacer este pedido:', '', ...lineas, '', `Subtotal estimado: ${pesos(totalPedido())}`, '(El valor final depende del peso exacto. Domicilio por confirmar.)'];
  const nombre = $('#cli-nombre').value.trim();
  const direccion = $('#cli-direccion').value.trim();
  const notas = $('#cli-notas').value.trim();
  if (nombre || direccion || notas) partes.push('');
  if (nombre) partes.push(`Nombre: ${nombre}`);
  if (direccion) partes.push(`Dirección y barrio: ${direccion}`);
  if (notas) partes.push(`Notas: ${notas}`);
  return partes.join('\n');
}

$('#enviar').addEventListener('click', () => {
  if (!cantidadItems()) return;
  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje())}`;
  window.open(url, '_blank', 'noopener');
});

pintar();

/* ---------- Botón flotante de WhatsApp: aparece al salir del inicio ---------- */
const flotante = $('.wa-flotante');
const inicio = $('.inicio');
if (flotante && inicio && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => flotante.classList.toggle('visible', !e.isIntersecting)).observe(inicio);
} else if (flotante) {
  flotante.classList.add('visible');
}

/* ---------- Aparición suave de lo que está más abajo ---------- */
if (!reducirMovimiento && 'IntersectionObserver' in window) {
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  $$('.tarjeta, .pasos li, .otros, .combo .contenedor > *, .nosotros .contenedor > *').forEach((el) => {
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.classList.add('aparece');
      obs.observe(el);
    }
  });
}
