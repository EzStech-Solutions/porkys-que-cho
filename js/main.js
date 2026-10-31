// Año del pie de página
document.getElementById('anio').textContent = new Date().getFullYear();

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// El botón flotante de WhatsApp aparece cuando el inicio sale de la pantalla
const flotante = document.querySelector('.wa-flotante');
const inicio = document.querySelector('.inicio');
if (flotante && inicio && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => flotante.classList.toggle('visible', !e.isIntersecting))
    .observe(inicio);
} else if (flotante) {
  flotante.classList.add('visible');
}

// Aparición suave de lo que está más abajo (se omite con "reducir movimiento")
if (!reducirMovimiento && 'IntersectionObserver' in window) {
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.tarjeta, .pasos li, .otros, .combo .contenedor > *, .nosotros .contenedor > *').forEach((el) => {
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.classList.add('aparece');
      obs.observe(el);
    }
  });
}
