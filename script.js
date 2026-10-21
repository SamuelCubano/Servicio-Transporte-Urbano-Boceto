/* ===================================================================
   TransUrbano — Servicio de Transporte Urbano
   Lógica de simulación, mapa Leaflet en vivo y animaciones GSAP
   =================================================================== */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const rand = (a, b) => Math.random() * (b - a) + a;
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[randInt(0, arr.length - 1)];
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ==============================================================
     1. DATOS DEL SISTEMA
     ============================================================== */

  /* Centro de operaciones: Plaza Bolívar, Caracas (Distrito Capital, Venezuela) */
  const CENTRO = [10.5060, -66.9146];

  let rutaSeleccionada = null;

  /* Clave de los basemaps de CARTO (carto.com/basemaps). Desde el 25/09/2026 CARTO
     exige clave en las teselas raster: sin ella responde con un mosaico de aviso
     "API KEY REQUIRED" en lugar del mapa. */
  const CARTO_KEY = 'cb1_4qtz_1_a4f910a24681b990d4cbaf49';

  /* ==============================================================
     1.1 CORREDORES REALES DE CARACAS
     ============================================================== */

  const RUTAS = [
    { id: 'R1', nombre: 'Avenida Bolívar', calle: 'Av. Bolívar / Av. San Martín', color: '#2f9e63',
      coords: [[10.5060,-66.9146],[10.5095,-66.9050],[10.5060,-66.9220],[10.4953,-66.9235],
               [10.4818,-66.9498],[10.4700,-66.9700],[10.4655,-66.9786]],
      avg: 22, paradas: 26, sector: 'Centro' },
    { id: 'R2', nombre: 'Avenida Caracas-La Guaira', calle: 'Autopista Caracas-La Guaira', color: '#29b6f6',
      coords: [[10.5060,-66.9146],[10.4969,-66.8857],[10.5085,-66.8990],[10.5218,-66.9454],
               [10.5500,-66.9330],[10.6000,-66.9296],[10.6031,-66.9967]],
      avg: 26, paradas: 31, sector: 'Oeste' },
    { id: 'R3', nombre: 'Avenida Universidad', calle: 'Av. Universidad / Av. Francisco de Miranda', color: '#8b7cf6',
      coords: [[10.5060,-66.9146],[10.5030,-66.9000],[10.4969,-66.8857],[10.4988,-66.8520],
               [10.5001,-66.8441],[10.4700,-66.8300],[10.4350,-66.8663]],
      avg: 20, paradas: 24, sector: 'Norte' },
    { id: 'R4', nombre: 'Avenida Miranda', calle: 'Av. Miranda / Av. Principal de Petare', color: '#f5a623',
      coords: [[10.5060,-66.9146],[10.4969,-66.8857],[10.4956,-66.8489],[10.4821,-66.8404],
               [10.4666,-66.8078],[10.4787,-66.8072]],
      avg: 30, paradas: 28, sector: 'Este' },
    { id: 'R5', nombre: 'Metrocable San Agustín', calle: 'MetroCable Marichipongo', color: '#12b5a5',
      coords: [[10.4790,-66.8930],[10.4700,-66.8860],[10.4600,-66.8790],[10.4470,-66.8720],[10.4350,-66.8663]],
      avg: 14, paradas: 17, sector: 'Sur' },
    { id: 'R6', nombre: 'Avenida Urdaneta', calle: 'Av. Urdaneta / Metro El Silencio', color: '#4fc3f7',
      coords: [[10.5060,-66.9188],[10.5087,-66.9200],[10.5043,-66.9218],[10.5003,-66.8962],
               [10.4905,-66.8938],[10.4790,-66.8930]],
      avg: 11, paradas: 19, sector: 'Centro' },
    { id: 'R7', nombre: 'Metrocable Palo Verde', calle: 'MetroCable Las Vegas / Palo Verde', color: '#7ed957',
      coords: [[10.4350,-66.8663],[10.4470,-66.8560],[10.4620,-66.8250],[10.4788,-66.7985],[10.4690,-66.7830]],
      avg: 16, paradas: 23, sector: 'Este' },
    { id: 'R8', nombre: 'Avenida San Martín', calle: 'Av. San Martín / Av. Sucre', color: '#ff8a65',
      coords: [[10.5060,-66.9146],[10.5043,-66.9218],[10.4953,-66.9235],[10.4850,-66.9450],
               [10.5050,-66.9500],[10.5218,-66.9454]],
      avg: 18, paradas: 21, sector: 'Oeste' }
  ];

  const CONDUCTORES = [
    'José González', 'María Vargas', 'Luis Rodríguez', 'Carmen Bracho', 'Rafael Herrera',
    'Sandra Márquez', 'Andrés Lovera', 'Paola Requena', 'Héctor Valera', 'Diana Cárdenas',
    'Wilker Rojas', 'Gloria Méndez', 'Camilo Arvelo', 'Yulima Pérez', 'Óscar Marcano'
  ];

  /* Paradas por corredor, en orden geográfico desde el origen de la ruta */
  const PARADAS_RUTA = {
    R1: ['Plaza Bolívar', 'Avenida San Martín', 'El Calvario', 'San Juan', 'La Vega', 'Las Mercedes', 'Antímano'],
    R2: ['Plaza Bolívar', 'Plaza Venezuela', 'La-emergencia', 'Catia La Mar', 'La Curia', 'La Guaira', 'Maiquetía'],
    R3: ['Plaza Bolívar', 'Avenida Universidad', 'Plaza Venezuela', 'La Castellana', 'Los Palos Grandes',
         'Av. Principal de La Trinidad', 'Terminal La Trinidad'],
    R4: ['Plaza Bolívar', 'Plaza Venezuela', 'Altamira', 'Chuao', 'Av. Miranda / Los Teques', 'Petare',
         'Terminal de Petare'],
    R5: ['San Agustín', 'Marichipongo', 'La Coseña', 'Palo Verde', 'La Trinidad',
         'Terminal La Trinidad', 'Metro El Silencio'],
    R6: ['Metro El Silencio', 'Avenida Urdaneta', 'El Calvario', 'Museo de Bellas Artes',
         'Hospital Universitario', 'Universidad Central', 'San Agustín'],
    R7: ['Terminal La Trinidad', 'La Trinidad', 'Palo Verde', 'La Mariposa', 'Las Vegas', 'El Hatillo',
         'Las Espinas'],
    R8: ['Plaza Bolívar', 'El Calvario', 'Plaza San Martín', 'San Juan', 'Av. Sucre / La-emergencia',
         'La Guaira', 'Catia La Mar']
  };

  const SECTORES = ['Centro', 'Norte', 'Sur', 'Este', 'Oeste'];

  /* Estado de tráfico por ruta (0-100) */
  const trafico = RUTAS.map(() => ({
    nivel: 'fluido', valor: randInt(18, 42), delta: randInt(-4, 6)
  }));

  const NIVELES = {
    fluido:        { label: 'Fluido',       color: '#4aa96c', rango: [0, 45] },
    moderado:      { label: 'Moderado',     color: '#f5a623', rango: [46, 75] },
    congestionado: { label: 'Congestionado', color: '#e5484d', rango: [76, 100] }
  };

  /* ==============================================================
     2. GENERACIÓN DE UNIDADES
     ============================================================== */

  const unidades = [];
  (function generarUnidades() {
    const tipos = [
      { nombre: 'Bus urbano',      puestos: 46, espacios: 4 },
      { nombre: 'Bus ejecutivo',   puestos: 32, espacios: 6 },
      { nombre: 'Microbus',        puestos: 22, espacios: 2 },
      { nombre: 'Bus articulado',  puestos: 78, espacios: 10 },
      { nombre: 'Bus eléctrico',   puestos: 40, espacios: 8 }
    ];
    for (let i = 0; i < 18; i++) {
      const t = tipos[i % tipos.length];
      const estado = i === 3 ? 'mantenimiento' : (i % 4 === 0 ? 'parada' : 'operativa');
      unidades.push({
        id: 'U-' + (1000 + i * 7),
        placa: String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i + 7) % 26)) + (1000 + i * 137),
        tipo: t.nombre,
        puestos: t.puestos + randInt(-2, 3),
        espacios: t.espacios,
        conductor: CONDUCTORES[i % CONDUCTORES.length],
        tarjeta: 'V-' + (15827344 + i * 13711),
        ruta: RUTAS[i % RUTAS.length].id,
        estado,
        accesible: t.espacios >= 6,
       ptime: estado === 'operativa' ? randInt(0, 3) + ' min' : '—',
        carga: randInt(12, 96),
        vel: randInt(18, 42),
        rutaIdx: i % RUTAS.length,
        pos: Math.random(),
        dir: Math.random() > 0.5 ? 1 : -1,
        posMini: Math.random(),
        dirMini: Math.random() > 0.5 ? 1 : -1,
        velMs: rand(0.00022, 0.00055)
      });
    }
  })();

  /* ==============================================================
     3. PARADAS
     ============================================================== */

  const paradas = [];
  (function generarParadas() {
    RUTAS.forEach((r, ri) => {
      const n = 5 + (ri % 3);
      const nombres = PARADAS_RUTA[r.id] || [];
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        paradas.push({
          id: 'P' + (String(ri + 1) + String(i + 1).padStart(2, '0')),
          nombre: nombres.length ? nombres[i % nombres.length] : 'Parada ' + (i + 1),
          ruta: r.id,
          t: t,
          sector: r.sector,
          capacidad: randInt(20, 90),
          pasajeros: randInt(0, 40),
          espera: randInt(1, 12)
        });
      }
      r.paradas = n;   // la cabecera refleja las paradas realmente generadas
    });
  })();

  /* ==============================================================
     4. UTILIDADES UI
     ============================================================== */

  function toast(titulo, msg, tipo) {
    const stack = $('#toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (tipo || '');
    const iconos = {
      '': '<path d="M20 6 9 17l-5-5"/>',
      ok: '<path d="M20 6 9 17l-5-5"/>',
      err: '<path d="M18 6 6 18M6 6l12 12"/>',
      warn: '<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>'
    };
    const color = { '': '#2f9e63', ok: '#2f9e63', err: '#e5484d', warn: '#f5a623', info: '#29b6f6' }[tipo || ''];
    el.innerHTML =
      '<span class="toast-ico" style="background:' + color + '">' +
      '<svg viewBox="0 0 24 24">' + (iconos[tipo || ''] || iconos['']) + '</svg></span>' +
      '<div><b>' + titulo + '</b>' + (msg ? '<small>' + msg + '</small>' : '') + '</div>';
    stack.appendChild(el);
    if (window.gsap) {
      gsap.from(el, { x: 60, opacity: 0, duration: 0.45, ease: 'back.out(1.6)' });
    }
    setTimeout(() => {
      if (window.gsap) gsap.to(el, { x: 60, opacity: 0, duration: 0.35, onComplete: () => el.remove() });
      else el.remove();
    }, 4600);
  }

  function abrirModal(html) {
    const bd = $('#modalBackdrop');
    $('#modalBody').innerHTML = html;
    bd.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (window.gsap) {
      gsap.fromTo('#modal', { y: 26, scale: 0.96 }, { y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.4)' });
      gsap.fromTo('#modalBody > *', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, delay: 0.08, ease: 'power2.out' });
    }
  }
  function cerrarModal() {
    const bd = $('#modalBackdrop');
    bd.classList.remove('open');
    document.body.style.overflow = '';
  }
  $('#modalClose').addEventListener('click', cerrarModal);
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target === $('#modalBackdrop')) cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

  // Acciones dentro de los modales (delegacion)
  $('#modalBody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    const accion = btn.dataset.accion;
    const id = btn.dataset.id;
    cerrarModal();
    document.getElementById('rutas').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      if (accion === 'ver-unidad') {
        const u = unidades.find(x => x.id === id);
        if (u) { enfocarUnidad(u); toast('Unidad ' + u.id, 'Posición en el mapa actualizada.', 'info'); }
      } else if (accion === 'ver-parada') {
        const p = paradas.find(x => x.id === id);
        if (p && mapa) {
          mapa.setView([p.lat, p.lng], 16);
          if (p._marca) p._marca.openTooltip();
          toast(p.nombre, 'Parada ' + p.id + ' · ruta ' + p.ruta, 'info');
        }
      } else if (accion === 'ver-ruta') {
        const r = RUTAS.find(x => x.id === id);
        if (r) encuadrarRuta(r);
      }
    }, 420);
  });

  /* ==============================================================
     5. MAPA LEAFLET + OPENSTREETMAP EN VIVO
     ============================================================== */

  const TIENDAS = {
    claro: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + CARTO_KEY,
      attr: '&copy; OpenStreetMap &copy; CARTO',
      max: 19,
      nombre: 'Estilo claro (CARTO Voyager)'
    },
    oscuro: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=' + CARTO_KEY,
      attr: '&copy; OpenStreetMap &copy; CARTO',
      max: 19,
      nombre: 'Estilo oscuro (CARTO Dark Matter)'
    },
    estandar: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap',
      max: 19,
      nombre: 'Estándar de OpenStreetMap'
    }
  };

  let mapa = null;
  let mapaMini = null;
  let capaActual = null;
  let capaMini = null;

  /* --- utilidades geodésicas --- */
  function distanciaMetros(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad;
    const dLng = (b[1] - a[1]) * rad;
    const x = dLng * Math.cos((a[0] + b[0]) / 2 * rad);
    return Math.sqrt(x * x + dLat * dLat) * 6371000;
  }
  function rumbo(a, b) {
    const rad = Math.PI / 180;
    const y = Math.sin((b[1] - a[1]) * rad) * Math.cos(b[0] * rad);
    const x = Math.cos(a[0] * rad) * Math.sin(b[0] * rad) -
              Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((b[1] - a[1]) * rad);
    return Math.atan2(y, x) * 180 / Math.PI;
  }
  function prepararRuta(r) {
    r.segmentos = [];
    r.distanciaTotal = 0;
    for (let i = 0; i < r.coords.length - 1; i++) {
      const d = distanciaMetros(r.coords[i], r.coords[i + 1]);
      r.segmentos.push(d);
      r.distanciaTotal += d;
    }
    return r;
  }
  /** Devuelve {lat, lng, ang} para una posicion t (0-1) sobre la ruta. */
  function puntoEnRuta(r, t) {
    if (!r.segmentos) prepararRuta(r);
    const dist = clamp(t, 0, 1) * r.distanciaTotal;
    let acum = 0;
    for (let i = 0; i < r.segmentos.length; i++) {
      if (acum + r.segmentos[i] >= dist || i === r.segmentos.length - 1) {
        const f = r.segmentos[i] ? (dist - acum) / r.segmentos[i] : 0;
        const a = r.coords[i], b = r.coords[i + 1];
        return {
          lat: a[0] + (b[0] - a[0]) * f,
          lng: a[1] + (b[1] - a[1]) * f,
          ang: rumbo(a, b)
        };
      }
      acum += r.segmentos[i];
    }
    const p = r.coords[0];
    return { lat: p[0], lng: p[1], ang: 0 };
  }

  /* Extensión geographico de la red completa (todas las rutas) */
  function limitesRed() {
    const b = L.latLngBounds([]);
    RUTAS.forEach(r => r.coords.forEach(c => b.extend(c)));
    return b;
  }

  /* --- icono de bus --- */
  function iconoBus(color, estado) {
    return L.divIcon({
      className: 'bus-marker-wrap',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: '<span class="bus-marker' + (estado === 'mantenimiento' ? ' bus-off' : '') + '">' +
            '<span class="bus-body" style="background:' + color + '"></span>' +
            '<span class="bus-window"></span></span>'
    });
  }

  /* ==============================================================
     5.1 CONSTRUCCION DEL MAPA PRINCIPAL
     ============================================================== */

  function construirMapa() {
    if (!window.L) {
      $('#cityMap').innerHTML =
        '<div class="map-fallback"><b>Mapa no disponible</b>' +
        '<small>No se pudo cargar Leaflet/OpenStreetMap (se requiere conexión a internet).</small></div>';
      return;
    }

    mapa = L.map('cityMap', {
      center: CENTRO,
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      worldCopyJump: true
    });

    /* Encuadre inicial: la red completa de Caracas */
    mapa.fitBounds(limitesRed(), { padding: [6, 6], maxZoom: 13 });

    capaActual = L.tileLayer(TIENDAS.claro.url, {
      attribution: TIENDAS.claro.attr,
      maxZoom: TIENDAS.claro.max,
      crossOrigin: true
    }).addTo(mapa);

    let avisoTiles = false;
    capaActual.on('tileerror', () => {
      if (!avisoTiles) {
        avisoTiles = true;
        toast('Mapa sin conexión', 'No se pudieron cargar los mosaicos de OpenStreetMap.', 'warn');
      }
    });

    RUTAS.forEach(prepararRuta);
    dibujarRutas(mapa, true);
    dibujarParadas(mapa, true);
    dibujarUnidades(mapa, false);

    // Control de capas interno (botón "capa")
    const controlCapas = L.control({ position: 'topright' });
    controlCapas.onAdd = function () {
      const div = L.DomUtil.create('div', 'leaflet-control-capas');
      div.innerHTML =
        '<button type="button" data-capa="claro" class="cap-btn active">Claro</button>' +
        '<button type="button" data-capa="oscuro" class="cap-btn">Oscuro</button>' +
        '<button type="button" data-capa="estandar" class="cap-btn">OSM</button>';
      L.DomEvent.disableClickPropagation(div);
      div.addEventListener('click', (e) => {
        const btn = e.target.closest('.cap-btn');
        if (!btn) return;
        const modo = btn.dataset.capa;
        div.querySelectorAll('.cap-btn').forEach(b => b.classList.toggle('active', b === btn));
        const nueva = L.tileLayer(TIENDAS[modo].url, {
          attribution: TIENDAS[modo].attr, maxZoom: TIENDAS[modo].max, crossOrigin: true
        });
        if (capaActual) mapa.removeLayer(capaActual);
        capaActual = nueva.addTo(mapa);
        capaActual.bringToBack();
        toast('Mapa base actualizado', TIENDAS[modo].nombre, 'info');
      });
      return div;
    };
    controlCapas.addTo(mapa);

    // al redimensionar la ventana el mapa debe recalcular su tamaño
    window.addEventListener('resize', () => {
      if (mapa) mapa.invalidateSize();
      if (mapaMini) mapaMini.invalidateSize();
    });

    // al mostrar por scroll se recalcula el tamano (por si estaba oculto)
    if (window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: '#rutas', start: 'top bottom', once: true,
        onEnter: () => mapa && mapa.invalidateSize()
      });
    }
  }

  function dibujarRutas(m, conFlujo) {
    RUTAS.forEach(r => {
      const halo = L.polyline(r.coords, {
        color: r.color, weight: 16, opacity: 0.16, lineCap: 'round', lineJoin: 'round'
      }).addTo(m);
      const linea = L.polyline(r.coords, {
        color: r.color, weight: 6, opacity: 0.92, lineCap: 'round', lineJoin: 'round'
      }).addTo(m);
      L.polyline(r.coords, {
        color: '#ffffff', weight: 2.4, opacity: 0.9, dashArray: '3 16',
        className: 'ruta-flujo'
      }).addTo(m);

      halo.on('mouseover', () => halo.setStyle({ opacity: 0.34 }));
      halo.on('mouseout', () => halo.setStyle({ opacity: 0.16 }));
      linea.on('click', () => seleccionarRuta(r.id));

      if (conFlujo) {
        halo.bindTooltip(
          '<b>' + r.nombre + '</b><br>' + r.calle + '<br>' +
          r.paradas + ' paradas · ' + r.avg + ' min promedio',
          { sticky: true, className: 'leaflet-tooltip transu' });
      }
    });
  }

  function dibujarParadas(m, conTooltip) {
    paradas.forEach(p => {
      const r = RUTAS.find(x => x.id === p.ruta);
      const pos = puntoEnRuta(r, p.t);
      p.lat = pos.lat; p.lng = pos.lng;
      const circulo = L.circleMarker([pos.lat, pos.lng], {
        radius: 6, color: r.color, weight: 3,
        fillColor: '#ffffff', fillOpacity: 1
      }).addTo(m);
      p._marca = circulo;
      circulo.on('click', () => detalleParada(p, r));
      if (conTooltip) {
        circulo.bindTooltip(
          '<b>' + p.nombre + '</b><br>Parada ' + p.id + ' · Ruta ' + r.id + '<br>' +
          'Próxima unidad en <b>' + p.espera + ' min</b> · ' + p.pasajeros + ' pasajeros',
          { className: 'leaflet-tooltip transu', direction: 'top', offset: [0, -6] });
      }
    });
  }

  function dibujarUnidades(m, esMini) {
    unidades.forEach(u => {
      const r = RUTAS.find(x => x.id === u.ruta);
      const pos = puntoEnRuta(r, u.pos);
      u.lat = pos.lat; u.lng = pos.lng; u.ang = pos.ang;
      const marcador = L.marker([pos.lat, pos.lng], {
        icon: iconoBus(r.color, u.estado),
        zIndexOffset: 600,
        riseOnHover: true,
        interactive: !esMini,
        keyboard: false
      }).addTo(m);
      u._marca = marcador;
      if (esMini) {
        u._marcaMini = marcador;
      } else {
        marcador.bindTooltip(
          '<b>' + u.id + '</b> · ' + u.tipo + '<br>' + u.conductor + ' · ' + u.placa + '<br>' +
          u.puestos + ' puestos · ' + u.espacios + ' espacios<br>' +
          'Velocidad ' + u.vel + ' km/h · Ruta ' + u.ruta,
          { className: 'leaflet-tooltip transu', direction: 'top', offset: [0, -12] });
        marcador.on('click', () => detalleUnidad(u));
      }
    });
  }

  /* --- animacion de las unidades sobre las rutas --- */
  let ultimoFrame = performance.now();
  let frameMini = 0;
  let tick = 0;

  function moverUnidades(ts) {
    const dt = Math.min(64, ts - ultimoFrame);
    ultimoFrame = ts;
    tick++;

    /* solo calcular posiciones cada 2 frames para ahorrar CPU */
    if (tick % 2 === 0) {
      unidades.forEach(u => {
        if (u.estado === 'mantenimiento') {
          if (u._marca) u._marca.setOpacity(0.45);
          return;
        }
        u.pos += u.velMs * (dt / 16.67) * u.dir;
        if (u.pos > 1) { u.pos = 1; u.dir = -1; }
        if (u.pos < 0) { u.pos = 0; u.dir = 1; }

        const r = RUTAS.find(x => x.id === u.ruta);
        const pos = puntoEnRuta(r, u.pos);
        u.lat = pos.lat; u.lng = pos.lng; u.ang = pos.ang;

        if (u._marca) {
          u._marca.setLatLng([pos.lat, pos.lng]);
          const cuerpo = u._marca.getElement && u._marca.getElement().querySelector('.bus-marker');
          if (cuerpo) cuerpo.style.transform = 'rotate(' + (pos.ang + (u.dir < 0 ? 180 : 0)).toFixed(1) + 'deg)';
        }
        if (frameMini % 3 === 0 && u._marcaMini) {
          u._marcaMini.setLatLng([pos.lat, pos.lng]);
        }
      });
      frameMini++;
    }

    requestAnimationFrame(moverUnidades);
  }

  /* ==============================================================
     5.2 MINI MAPA EN EL HERO
     ============================================================== */

  function construirMiniMapa() {
    if (!window.L) {
      $('#miniMap').innerHTML =
        '<div class="map-fallback small"><b>Sin mapa</b><small>Leaflet no disponible</small></div>';
      return;
    }
    mapaMini = L.map('miniMap', {
      center: CENTRO,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      inertia: false
    });

    /* Vista general de la red en el mini mapa */
    mapaMini.fitBounds(limitesRed(), { padding: [6, 6], maxZoom: 12 });

    capaMini = L.tileLayer(TIENDAS.claro.url, {
      attribution: TIENDAS.claro.attr, maxZoom: TIENDAS.claro.max, crossOrigin: true
    }).addTo(mapaMini);

    RUTAS.forEach(prepararRuta);
    dibujarRutas(mapaMini, false);
    unidades.forEach(u => {
      const r = RUTAS.find(x => x.id === u.ruta);
      const pos = puntoEnRuta(r, u.pos);
      u._marcaMini = L.marker([pos.lat, pos.lng], {
        icon: iconoBus(r.color, u.estado),
        zIndexOffset: 600, interactive: false, keyboard: false
      }).addTo(mapaMini);
    });

    setTimeout(() => mapaMini && mapaMini.invalidateSize(), 250);
  }

  /* ==============================================================
     5.3 CONTROLES DEL MAPA
     ============================================================== */

  $('#btnZoomIn').addEventListener('click', () => { if (mapa) mapa.zoomIn(); });
  $('#btnZoomOut').addEventListener('click', () => { if (mapa) mapa.zoomOut(); });
  $('#btnCapa').addEventListener('click', () => {
    if (!mapa) return;
    const url = (capaActual && capaActual._url) || '';
    /* ciclo: claro -> oscuro -> OSM -> claro */
    let modo = 'claro';
    if (url.indexOf('dark_all') > -1) modo = 'estandar';
    else if (url.indexOf('cartocdn') > -1) modo = 'oscuro';
    const nueva = TIENDAS[modo];
    if (capaActual) mapa.removeLayer(capaActual);
    capaActual = L.tileLayer(nueva.url, {
      attribution: nueva.attr, maxZoom: nueva.max, crossOrigin: true
    }).addTo(mapa);
    capaActual.bringToBack();
    toast('Mapa base actualizado', nueva.nombre, 'info');
  });
  $('#btnLocate').addEventListener('click', () => {
    if (!mapa) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapa.setView([pos.coords.latitude, pos.coords.longitude], 15);
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8, color: '#29b6f6', weight: 3, fillColor: '#fff', fillOpacity: 1
          }).addTo(mapa).bindPopup('<b>Su ubicación</b>');
          toast('Ubicación centrada', 'Precisión aproximada de ' + Math.round(pos.coords.accuracy) + ' metros.', 'ok');
        },
        () => {
          mapa.setView(CENTRO, 14);
          toast('Ubicación no disponible', 'Se muestra el centro de operaciones.', 'warn');
        },
        { timeout: 5000 }
      );
    } else {
      mapa.setView(CENTRO, 14);
      toast('Ubicación no disponible', 'Se muestra el centro de operaciones.', 'warn');
    }
  });

  /** Centra el mapa en una unidad concreta. */
  function enfocarUnidad(u) {
    if (!mapa || !u) return;
    mapa.setView([u.lat, u.lng], 15);
    if (u._marca && u._marca.openPopup) u._marca.openTooltip();
  }

  /** Encuadra una ruta completa. */
  function encuadrarRuta(r) {
    if (!mapa || !r) return;
    mapa.fitBounds(L.latLngBounds(r.coords), { padding: [60, 60], maxZoom: 15 });
  }

  /* ==============================================================
     7. LISTA DE RUTAS + TRÁFICO
     ============================================================== */

  function nivelDeTrafico(v) {
    if (v <= 45) return 'fluido';
    if (v <= 75) return 'moderado';
    return 'congestionado';
  }

  function renderRutaList() {
    const cont = $('#routeList');
    cont.innerHTML = '';
    RUTAS.forEach((r, i) => {
      const t = trafico[i];
      const nivel = NIVELES[t.nivel];
      const card = document.createElement('div');
      card.className = 'route-card' + (rutaSeleccionada === r.id ? ' sel' : '');
      card.style.setProperty('--rc', r.color);
      const unidadesEnRuta = unidades.filter(u => u.ruta === r.id && u.estado !== 'mantenimiento').length;
      card.innerHTML =
        '<div class="rc-top"><span class="rc-name" style="color:' + r.color + '">' + r.nombre +
        '</span><span class="rc-code">' + r.id + '</span></div>' +
        '<p class="rc-desc">' + r.calle + '</p>' +
        '<div class="rc-meta">' +
        '<span class="tag">' + r.paradas + ' paradas</span>' +
        '<span class="tag blue">' + unidadesEnRuta + ' unidades</span>' +
        '<span class="tag ' + (t.nivel === 'fluido' ? 'green' : t.nivel === 'moderado' ? 'amber' : 'red') + '">' + nivel.label + '</span>' +
        '<span class="tag">~' + r.avg + ' min</span>' +
        '</div>';
      card.addEventListener('click', () => seleccionarRuta(r.id));
      cont.appendChild(card);
    });
  }

  function renderTrafico() {
    const cont = $('#trafficList');
    cont.innerHTML = '';
    RUTAS.forEach((r, i) => {
      const t = trafico[i];
      const nivel = NIVELES[t.nivel];
      const li = document.createElement('li');
      li.className = 'traf-item';
      li.innerHTML =
        '<span class="traf-name"><i class="traf-swatch" style="background:' + r.color + '"></i>' + r.nombre + '</span>' +
        '<span class="traf-bar"><i style="width:' + t.valor + '%;background:' + nivel.color + '"></i></span>' +
        '<span class="traf-state" style="color:' + nivel.color + '">' + nivel.label + '</span>' +
        '<span class="traf-delta">' + (t.delta >= 0 ? '+' : '') + t.delta + ' min</span>';
      li.addEventListener('click', () => seleccionarRuta(r.id));
      cont.appendChild(li);
    });
  }

  function seleccionarRuta(id) {
    rutaSeleccionada = rutaSeleccionada === id ? null : id;
    renderRutaList();
    const r = RUTAS.find(x => x.id === id);
    if (rutaSeleccionada) {
      toast('Ruta ' + r.id + ' seleccionada', r.nombre + ' · ' + r.calle, 'info');
      const idx = RUTAS.indexOf(r);
      const nivel = NIVELES[trafico[idx].nivel];
      abrirModal(
        '<h3 class="modal-title">' + r.nombre + '</h3>' +
        '<p class="modal-sub">' + r.calle + ' · sector ' + r.sector + '</p>' +
        '<div class="detail-grid">' +
        '<div class="detail-cell"><span>Código</span><b>' + r.id + '</b></div>' +
        '<div class="detail-cell"><span>Estado de tráfico</span><b style="color:' + nivel.color + '">' + nivel.label + '</b></div>' +
        '<div class="detail-cell"><span>Paradas</span><b>' + r.paradas + '</b></div>' +
        '<div class="detail-cell"><span>Tiempo promedio</span><b>' + r.avg + ' min</b></div>' +
        '<div class="detail-cell"><span>Unidades asignadas</span><b>' + unidades.filter(u => u.ruta === id).length + '</b></div>' +
        '<div class="detail-cell"><span>Unidad en sitio</span><b>' + paradas.filter(p => p.ruta === id).length + '</b></div>' +
        '</div>' +
        '<div class="modal-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>' +
        '<span>Velocidad promedio del corredor: <b>' + (rutaSeleccionada ? randInt(18, 44) : 0) + ' km/h</b>. ' +
        'El sistema recalcula el ETA de cada parada en función del tráfico y las paradas previas.</span></div>' +
        '<div class="modal-actions"><button class="btn btn-primary" onclick="document.getElementById(\'modalClose\').click();document.getElementById(\'incRuta\').value=\'' + r.id + '\';document.getElementById(\'incidencias\').scrollIntoView({behavior:\'smooth\'})">Reportar en esta ruta</button>' +
        '<button class="btn btn-glass" onclick="document.getElementById(\'modalClose\').click()">Cerrar</button></div>'
      );
      encuadrarRuta(r);
    } else if (mapa) {
      mapa.setView(CENTRO, 13);
    }
  }

  /* ==============================================================
     8. ALERTAS DE LLEGADAS TARDÍAS
     ============================================================== */

  let alertas = [];

  /* Nombre de una parada real de la ruta (para que la alerta sea coherente) */
  function pickParada(r) {
    const ps = paradas.filter(p => p.ruta === r.id);
    return ps.length ? pick(ps).nombre : r.nombre;
  }

  function generarAlertas(n) {
    for (let i = 0; i < n; i++) {
      const r = pick(RUTAS);
      const min = randInt(3, 18);
      alertas.push({
        ruta: r.id,
        nombre: r.nombre,
        parada: pickParada(r),
        min,
        critico: min > 13,
        ts: Date.now() - randInt(0, 40) * 60000
      });
    }
    alertas.sort((a, b) => b.min - a.min);
  }
  function renderAlertas() {
    const cont = $('#alertsList');
    cont.innerHTML = '';
    alertas.slice(0, 8).forEach(a => {
      const li = document.createElement('li');
      li.className = 'alert-item ' + (a.critico ? 'crit' : '');
      const mins = Math.max(1, Math.floor((Date.now() - a.ts) / 60000));
      li.innerHTML =
        '<span class="alert-ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>' +
        '<div class="alert-body"><b>' + a.nombre + '</b><small>' + a.parada + ' · ruta ' + a.ruta + '</small></div>' +
        '<span class="alert-min">+' + a.min + ' min</span>';
      cont.appendChild(li);
    });
    $('#alertCount').textContent = alertas.length;
  }
  setInterval(() => {
    const r = pick(RUTAS);
    const min = randInt(3, 19);
    alertas.unshift({ ruta: r.id, nombre: r.nombre, parada: pickParada(r), min, critico: min > 13, ts: Date.now() });
    if (alertas.length > 14) alertas.pop();
    renderAlertas();
  }, 9000);

  /* ==============================================================
     9. UNIDADES (tarjetas)
     ============================================================== */

  let filtroActivo = 'all';
  let busqueda = '';

  function renderUnidades() {
    const cont = $('#unitsGrid');
    cont.innerHTML = '';
    const filtradas = unidades.filter(u => {
      const okFiltro =
        filtroActivo === 'all' ? true :
        filtroActivo === 'accessible' ? u.accesible :
        u.estado === filtroActivo;
      const t = (u.id + ' ' + u.placa + ' ' + u.conductor + ' ' + u.ruta).toLowerCase();
      return okFiltro && t.includes(busqueda);
    });

    if (!filtradas.length) {
      cont.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;padding:40px">Sin unidades que coincidan con el criterio.</p>';
      return;
    }

    filtradas.forEach((u, i) => {
      const card = document.createElement('article');
      card.className = 'unit-card';
      const carga = Math.round((u.carga / 100) * 100);
      card.innerHTML =
        '<div class="uc-head">' +
        '<div><div class="uc-id">' + u.id + '</div><div class="uc-plate">PLACA ' + u.placa + ' · ' + u.tipo + '</div></div>' +
        '<span class="uc-status ' + u.estado + '">' + (u.estado === 'operativa' ? 'En ruta' : u.estado === 'parada' ? 'En parada' : 'Mantenimiento') + '</span>' +
        '</div>' +
        '<div class="uc-driver">' +
        '<span class="uc-avatar">' + u.conductor.split(' ').map(n => n[0]).slice(0, 2).join('') + '</span>' +
        '<div><b>' + u.conductor + '</b><small>Conductor · Tarjeta ' + u.tarjeta + '</small></div>' +
        '</div>' +
        '<div class="uc-specs">' +
        '<div class="spec"><b>' + u.puestos + '</b><small>Puestos</small></div>' +
        '<div class="spec"><b>' + u.espacios + '</b><small>Espacios</small></div>' +
        '<div class="spec"><b>' + u.ruta + '</b><small>Ruta</small></div>' +
        '</div>' +
        '<div class="uc-foot">' +
        '<span>Ocupación ' + carga + '%</span>' +
        '<span class="uc-view">Ver detalle <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span>' +
        '</div>';
      card.addEventListener('click', () => detalleUnidad(u));
      cont.appendChild(card);
      if (window.gsap) {
        gsap.fromTo(card, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: i * 0.035, ease: 'power2.out' });
      }
    });
  }

  function detalleUnidad(u) {
    const r = RUTAS.find(x => x.id === u.ruta);
    abrirModal(
      '<h3 class="modal-title">Unidad ' + u.id + '</h3>' +
      '<p class="modal-sub">' + u.tipo + ' · placa ' + u.placa + ' · tarjeta ' + u.tarjeta + '</p>' +
      '<div class="unit-detail-head">' +
      '<span class="uc-avatar">' + u.conductor.split(' ').map(n => n[0]).slice(0, 2).join('') + '</span>' +
      '<div><b style="font-family:var(--font-h);font-size:1.05rem;color:var(--green-900)">' + u.conductor + '</b>' +
      '<small style="display:block;color:var(--ink-soft);font-weight:700">Conductor identificado con tarjeta · Ruta ' + u.ruta + ' (' + r.nombre + ')</small></div>' +
      '</div>' +
      '<div class="detail-grid">' +
      '<div class="detail-cell"><span>Puestos disponibles</span><b>' + u.puestos + '</b></div>' +
      '<div class="detail-cell"><span>Espacios reservados</span><b>' + u.espacios + '</b></div>' +
      '<div class="detail-cell"><span>Ocupación actual</span><b>' + u.carga + '%</b></div>' +
      '<div class="detail-cell"><span>Velocidad</span><b>' + u.vel + ' km/h</b></div>' +
      '<div class="detail-cell"><span>Próxima parada</span><b>' + (u.estado === 'mantenimiento' ? '—' : randInt(1, 9) + ' min') + '</b></div>' +
      '<div class="detail-cell"><span>Estado</span><b>' + (u.estado === 'operativa' ? 'Operativa' : u.estado === 'parada' ? 'En parada' : 'Mantenimiento') + '</b></div>' +
      '</div>' +
      '<div class="modal-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>' +
      '<span>Posición registrada por GPS cada 3 segundos. Ultimo registro de tiempos disponible en la <b>Estación del conductor</b>.</span></div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-primary" onclick="document.getElementById(\'modalClose\').click();document.getElementById(\'incUnidad\').value=\'' + u.id + '\';document.getElementById(\'incidencias\').scrollIntoView({behavior:\'smooth\'})">Reportar esta unidad</button>' +
      '<button class="btn btn-soft" data-accion="ver-unidad" data-id="' + u.id + '">' +
      '<svg viewBox="0 0 24 24"><path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11z"/><circle cx="12" cy="11" r="3"/></svg>' +
      'Ver en el mapa</button>' +
      '<button class="btn btn-glass" onclick="document.getElementById(\'modalClose\').click()">Cerrar</button></div>'
    );
  }

  function detalleParada(p, r) {
    abrirModal(
      '<h3 class="modal-title">' + p.nombre + '</h3>' +
      '<p class="modal-sub">Parada ' + p.id + ' · sector ' + p.sector + ' · Ruta ' + r.id + ' (' + r.nombre + ')</p>' +
      '<div class="detail-grid">' +
      '<div class="detail-cell"><span>Próxima unidad</span><b>' + p.espera + ' min</b></div>' +
      '<div class="detail-cell"><span>Pasajeros en espera</span><b>' + p.pasajeros + '</b></div>' +
      '<div class="detail-cell"><span>Capacidad de la parada</span><b>' + p.capacidad + '</b></div>' +
      '<div class="detail-cell"><span>Unidades en ruta</span><b>' + unidades.filter(u => u.ruta === r.id).length + '</b></div>' +
      '</div>' +
      '<div class="modal-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>' +
      '<span>La ubicación se registra por GPS con una precisión aproximada de <b>8 metros</b> sobre el corredor vial.</span></div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-soft" data-accion="ver-parada" data-id="' + p.id + '">' +
      '<svg viewBox="0 0 24 24"><path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11z"/><circle cx="12" cy="11" r="3"/></svg>' +
      'Ver en el mapa</button>' +
      '<button class="btn btn-glass" onclick="document.getElementById(\'modalClose\').click()">Cerrar</button></div>'
    );
  }

  $('#unitFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    $$('.chip-btn', $('#unitFilters')).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroActivo = btn.dataset.f;
    renderUnidades();
  });
  $('#unitSearch').addEventListener('input', (e) => { busqueda = e.target.value.toLowerCase(); renderUnidades(); });

  /* ==============================================================
     10. PARADAS
     ============================================================== */

  function renderParadas(filtro) {
    const cont = $('#stopsList');
    const lista = paradas.filter(p => !filtro || p.nombre.toLowerCase().includes(filtro) || p.ruta.toLowerCase().includes(filtro));
    cont.innerHTML = '';
    lista.forEach((p, i) => {
      const li = document.createElement('div');
      li.className = 'stop-item' + (p.pasajeros > 25 ? ' busy' : '');
      li.innerHTML =
        '<span class="stop-idx">' + (i + 1) + '</span>' +
        '<div class="stop-info"><b>' + p.nombre + '</b><small>' + p.id + ' · Ruta ' + p.ruta + ' · ' + p.sector + ' · ' + p.pasajeros + ' en espera</small></div>' +
        '<div class="stop-eta"><b>' + p.espera + ' min</b><small>ETA</small></div>';
      li.addEventListener('click', () => detalleParada(p, RUTAS.find(r => r.id === p.ruta)));
      cont.appendChild(li);
    });
  }
  $('#stopSearch').addEventListener('input', (e) => renderParadas(e.target.value.toLowerCase()));

  function renderHeat() {
    const cont = $('#heatMap');
    cont.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('i');
      const size = randInt(50, 130);
      b.style.width = size + 'px'; b.style.height = size + 'px';
      b.style.left = randInt(-6, 92) + '%'; b.style.top = randInt(-6, 88) + '%';
      b.style.background = pick(['#4aa96c', '#29b6f6', '#f5a623']);
      cont.appendChild(b);
    }
  }

  /* ==============================================================
     11. INCIDENCIAS
     ============================================================== */

  const incidentes = [];
  function renderIncidentes() {
    const cont = $('#incList');
    cont.innerHTML = '';
    incidentes.forEach(inc => {
      const li = document.createElement('li');
      li.className = 'inc-item sev-' + inc.severidad;
      const t = new Date(inc.ts);
      li.innerHTML =
        '<div class="inc-top"><b>' + inc.tipo + '</b><span class="inc-time">' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + '</span></div>' +
        '<p>' + inc.desc + '</p>' +
        '<div class="inc-meta">' +
        '<span class="tag blue">Ruta ' + inc.ruta + '</span>' +
        (inc.unidad ? '<span class="tag">' + inc.unidad + '</span>' : '') +
        '<span class="tag ' + (inc.severidad === 'critica' ? 'red' : inc.severidad === 'alta' ? 'amber' : inc.severidad === 'baja' ? 'green' : '') + '">' + inc.severidad + '</span>' +
        (inc.coords ? '<span class="tag">GPS ' + inc.coords + '</span>' : '') +
        '</div>';
      cont.appendChild(li);
      if (window.gsap) gsap.fromTo(li, { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power2.out' });
    });
    $('#incTotal').textContent = incidentes.length + (incidentes.length === 1 ? ' reporte' : ' reportes');
    $('#kpiIncidents').textContent = incidentes.length;
  }

  function agregarIncidencia(datos) {
    incidentes.unshift(Object.assign({ ts: Date.now() }, datos));
    renderIncidentes();
  }

  $('#incRuta').innerHTML = RUTAS.map(r => '<option value="' + r.id + '">' + r.id + ' · ' + r.nombre + '</option>').join('');
  $('#incUnidad').innerHTML = '<option value="">No especificada</option>' +
    unidades.map(u => '<option value="' + u.id + '">' + u.id + ' · ' + u.tipo + ' (' + u.placa + ')</option>').join('');

  $('#incForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = $('#incTipo'), desc = $('#incDesc');
    let ok = true;
    [tipo, desc].forEach(el => {
      if (!el.value.trim()) { el.classList.add('invalid'); ok = false; }
      else el.classList.remove('invalid');
    });
    if (!ok) { toast('Datos incompletos', 'Indique el tipo de incidencia y la descripción.', 'err'); return; }

    agregarIncidencia({
      tipo: tipo.value,
      ruta: $('#incRuta').value,
      severidad: $('#incSeveridad').value,
      desc: desc.value.trim(),
      unidad: $('#incUnidad').value,
      coords: $('#incCoords').value.trim() || ($('#gpsValue').classList.contains('ok') ? $('#gpsValue').textContent : '')
    });
    $('#incForm').reset();
    toast('Incidencia registrada', 'Reporte #' + String(incidentes.length).padStart(3, '0') + ' enviado a la central de transporte.', 'ok');
  });

  $('#incForm').addEventListener('input', (e) => e.target.classList.remove('invalid'));

  function obtenerGps() {
    const salida = $('#gpsValue');
    const btn = $('#btnGps');
    if (navigator.geolocation) {
      salida.textContent = 'Obteniendo coordenadas...';
      btn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const la = pos.coords.latitude.toFixed(6), lo = pos.coords.longitude.toFixed(6);
          salida.textContent = 'Lat: ' + la + ' / Lon: ' + lo + ' (±' + Math.round(pos.coords.accuracy) + ' m)';
          salida.classList.add('ok');
          $('#incCoords').value = la + ', ' + lo;
          $('#gpsAcc').textContent = Math.round(pos.coords.accuracy) + ' m';
          $('#gpsPos').textContent = 'Lat: ' + la + ' / Lon: ' + lo;
          btn.disabled = false;
          toast('GPS obtenido', 'Ubicación registrada con precisión de ' + Math.round(pos.coords.accuracy) + ' metros.', 'ok');
        },
        () => gpsSimulado(),
        { timeout: 5000 }
      );
    } else {
      gpsSimulado();
    }
  }
  function gpsSimulado() {
    const la = (4.71 + Math.random() * 0.03).toFixed(6);
    const lo = (-74.07 + Math.random() * 0.04).toFixed(6);
    const salida = $('#gpsValue');
    salida.textContent = 'Lat: ' + la + ' / Lon: ' + lo + ' (±8 m)';
    salida.classList.add('ok');
    $('#incCoords').value = la + ', ' + lo;
    $('#gpsAcc').textContent = '8 m';
    $('#gpsPos').textContent = 'Lat: ' + la + ' / Lon: ' + lo;
    $('#btnGps').disabled = false;
    toast('GPS obtenido', 'Coordenadas de la zona urbana registradas.', 'ok');
  }
  $('#btnGps').addEventListener('click', obtenerGps);

  /* ==============================================================
     12. IDENTIFICACIÓN CON TARJETA + REGISTRO GPS
     ============================================================== */

  const TARJETAS = {
    '15827344': { nombre: 'José González', rol: 'Conductor · Ruta R1', unidad: 'U-1000', tipo: 'conductor' },
    '24910387': { nombre: 'María Vargas', rol: 'Conductora · Ruta R2', unidad: 'U-1007', tipo: 'conductor' },
    '11204456': { nombre: 'Carmen Bracho', rol: 'Pasajera · Plan Tarjeta Urbana', unidad: '—', tipo: 'pasajero' }
  };

  let sesion = null;

  $('#tarjetaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = $('#tarjetaInput').value.replace(/[^0-9]/g, '');
    if (raw.length < 4) { toast('Tarjeta no válida', 'El número debe tener al menos 4 dígitos.', 'err'); return; }
    const datos = TARJETAS[raw];
    if (!datos) {
      toast('Tarjeta no reconocida', 'El número ' + raw + ' no está registrado en el sistema.', 'err');
      return;
    }
    sesion = datos;
    $('#cardSession').hidden = false;
    $('#sessionAvatar').textContent = datos.nombre.split(' ').map(n => n[0]).slice(0, 2).join('');
    $('#sessionName').textContent = datos.nombre;
    $('#sessionRole').textContent = datos.rol;
    $('#sessionCard').textContent = 'Cédula V-' + raw + ' validada';
    $('#userChipText').textContent = datos.nombre.split(' ')[0];
    $('#gpsUnit').textContent = datos.unidad;
    toast('Identidad validada', datos.nombre + ' · ' + datos.rol, 'ok');
    if (window.gsap) gsap.fromTo('#cardSession', { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
    if (datos.tipo === 'conductor') registrarRecorrido();
  });

  $('#btnLogout').addEventListener('click', () => {
    sesion = null;
    $('#cardSession').hidden = true;
    $('#userChipText').textContent = 'Identificar tarjeta';
    $('#tarjetaInput').value = '';
    $('#gpsRows').innerHTML = '';
    $('#gpsUnit').textContent = 'Sin asignar';
    toast('Sesión finalizada', 'La tarjeta ha sido retirada del lector.', 'info');
  });

  function registrarRecorrido() {
    const ruta = RUTAS[0];
    const unidadesRuta = unidades.filter(u => u.ruta === ruta.id);
    const base = new Date();
    const filas = paradas.filter(p => p.ruta === ruta.id).slice(0, 5);
    $('#gpsRows').innerHTML = '';
    filas.forEach((p, i) => {
      const prog = new Date(base.getTime() + i * 6 * 60000);
      const real = new Date(prog.getTime() + randInt(-3, 9) * 60000);
      const dif = Math.round((real - prog) / 60000);
      const estado = dif <= 2 ? 'ok' : dif <= 7 ? 'late' : 'crit';
      const etq = estado === 'ok' ? 'En horario' : estado === 'late' ? 'Retraso leve' : 'Retraso crítico';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + p.nombre + '</td>' +
        '<td>' + pad(prog.getHours()) + ':' + pad(prog.getMinutes()) + '</td>' +
        '<td>' + pad(real.getHours()) + ':' + pad(real.getMinutes()) + '</td>' +
        '<td class="' + (estado === 'ok' ? 'diff-ok' : estado === 'late' ? 'diff-late' : 'diff-crit') + '">' + (dif > 0 ? '+' : '') + dif + ' min</td>' +
        '<td><span class="st-pill ' + estado + '">' + etq + '</span></td>';
      $('#gpsRows').appendChild(tr);
      if (window.gsap) gsap.fromTo(tr, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.4, delay: i * 0.08, ease: 'power2.out' });
    });
    toast('Registro GPS actualizado', 'Se almacenaron ' + filas.length + ' lecturas de tiempo de la unidad asignada.', 'info');
  }

  $('#btnSimularGps').addEventListener('click', () => {
    if (!sesion) {
      toast('Identificación requerida', 'Valide su tarjeta para registrar tiempos de recorrido.', 'warn');
      $('#conductor').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    registrarRecorrido();
    const la = (4.71 + Math.random() * 0.03).toFixed(6);
    const lo = (-74.07 + Math.random() * 0.04).toFixed(6);
    $('#gpsPos').textContent = 'Lat: ' + la + ' / Lon: ' + lo;
    $('#gpsAcc').textContent = randInt(5, 14) + ' m';
    if (window.gsap) gsap.fromTo('#gpsRows tr', { opacity: 0.35 }, { opacity: 1, duration: 0.6, stagger: 0.05 });
  });

  /* ==============================================================
     13. BOTONES FLOTANTES: EMERGENCIA Y REPORTE
     ============================================================== */

  $('#btnEmergencia').addEventListener('click', () => {
    abrirModal(
      '<h3 class="modal-title">Centro de emergencias</h3>' +
      '<p class="modal-sub">Seleccione la acción inmediata. La central de transporte recibe la alerta con su ubicación GPS en menos de 10 segundos.</p>' +
      '<div class="emerg-grid">' +
      '<button class="emerg-opt" data-act="llamar"><span class="eo-ico" style="background:linear-gradient(160deg,#ff6b6b,#e5484d)"><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></span><b>Llamar al 123</b><small>Desvía a la línea de emergencias municipal</small></button>' +
      '<button class="emerg-opt" data-act="central"><span class="eo-ico" style="background:linear-gradient(160deg,var(--green-400),var(--green-600))"><svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></span><b>Central de transporte</b><small>Canal directo con el despacho operativo</small></button>' +
      '<button class="emerg-opt" data-act="ubicacion"><span class="eo-ico" style="background:linear-gradient(160deg,var(--sky-400),var(--sky-600))"><svg viewBox="0 0 24 24"><path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11z"/><circle cx="12" cy="11" r="3"/></svg></span><b>Compartir ubicación</b><small>Envía sus coordenadas GPS en vivo</small></button>' +
      '<button class="emerg-opt" data-act="unidad"><span class="eo-ico" style="background:linear-gradient(160deg,#ffd15c,var(--amber))"><svg viewBox="0 0 24 24"><path d="M9 20l-6-2V6l6 2 6-2 6 2v12l-6-2-6 2z"/></svg></span><b>Reportar unidad</b><small>Solicita asistencia de la unidad más cercana</small></button>' +
      '</div>' +
      '<div class="modal-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>' +
      '<span>Su sesión actual: <b>' + (sesion ? sesion.nombre + ' · ' + sesion.rol : 'Sin tarjeta validada') + '</b>. ' +
      'Tiempo de respuesta promedio de la central: <b>18 segundos</b>.</span></div>' +
      '<div class="modal-actions"><button class="btn btn-glass" onclick="document.getElementById(\'modalClose\').click()">Cerrar</button></div>'
    );
    $$('.emerg-opt', $('#modalBody')).forEach(b => {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        const textos = {
          llamar: 'Llamada al 123 en curso desde la unidad más cercana.',
          central: 'La central de transporte fue notificada. Operador asignado #12.',
          ubicacion: 'Ubicación GPS compartida con la central de transporte.',
          unidad: 'La unidad más cercana fue enviada a su ubicación.'
        };
        toast('Emergencia activada', textos[act], 'err');
        if (act === 'unidad') {
          const u = unidades.filter(x => x.estado === 'operativa')[0];
          if (u) {
            agregarIncidencia({
              tipo: 'Emergencia a bordo', ruta: u.ruta, severidad: 'critica',
              desc: 'Emergencia reportada desde el botón de emergencia de la plataforma. Unidad ' + u.id + ' enviada en respuesta.',
              unidad: u.id, coords: ''
            });
          }
        }
        cerrarModal();
      });
    });
  });

  $('#btnReporte').addEventListener('click', () => {
    abrirModal(
      '<h3 class="modal-title">Reporte rápido</h3>' +
      '<p class="modal-sub">Describa la situación en una línea. El reporte se abre en la central con prioridad inmediata.</p>' +
      '<div class="field"><label for="qTipo">Tipo</label><select id="qTipo">' +
      '<option>Retraso prolongado</option><option>Sobrecupo</option><option>Falla de unidad</option>' +
      '<option>Parada no operativa</option><option>Desvío de ruta</option><option>Seguridad</option></select></div>' +
      '<div class="field"><label for="qDesc">Descripción</label><textarea id="qDesc" rows="3" placeholder="Indique la ruta, la parada y la hora aproximada..."></textarea></div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-primary" id="qEnviar">Enviar reporte</button>' +
      '<button class="btn btn-glass" onclick="document.getElementById(\'modalClose\').click()">Cancelar</button></div>'
    );
    $('#qEnviar').addEventListener('click', () => {
      const d = $('#qDesc').value.trim();
      if (!d) { toast('Descripción requerida', 'Escriba el detalle del reporte.', 'err'); return; }
      agregarIncidencia({ tipo: $('#qTipo').value, ruta: 'R2', severidad: 'media', desc: d, unidad: '', coords: '' });
      toast('Reporte enviado', 'Se registró la incidencia #' + String(incidentes.length).padStart(3, '0') + '.', 'ok');
      cerrarModal();
    });
  });

  /* ==============================================================
     14. RELOJ, KPIs Y ACTUALIZACIÓN EN VIVO
     ============================================================== */

  function actualizarReloj() {
    const d = new Date();
    const t = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    const c = $('#clock'); if (c) c.textContent = t;
    const g = $('#gpsClock'); if (g) g.textContent = t;
  }
  setInterval(actualizarReloj, 1000);
  actualizarReloj();

  function actualizarKpis() {
    const operativas = unidades.filter(u => u.estado !== 'mantenimiento').length;
    $('#kpiUnits').textContent = operativas;
    const retraso = Math.round(trafico.reduce((a, t) => a + (t.nivel === 'congestionado' ? 9 : t.nivel === 'moderado' ? 4 : 1), 0) / RUTAS.length);
    $('#kpiDelay').textContent = retraso + ' min';
  }

  setInterval(() => {
    trafico.forEach((t, i) => {
      t.valor = clamp(t.valor + randInt(-7, 7), 8, 98);
      t.delta = randInt(-5, 7);
      t.nivel = nivelDeTrafico(t.valor);
    });
    renderTrafico();
    renderRutaList();
    unidades.forEach(u => {
      if (u.estado === 'operativa') { u.vel = clamp(u.vel + randInt(-4, 4), 8, 58); u.carga = clamp(u.carga + randInt(-4, 4), 5, 100); }
      else if (u.estado === 'parada') u.espera = (u.espera || randInt(1, 9));
    });
    paradas.forEach(p => { p.espera = clamp(p.espera + randInt(-2, 3), 1, 22); p.pasajeros = clamp(p.pasajeros + randInt(-4, 6), 0, 60); });
    renderParadas($('#stopSearch').value.toLowerCase());
    actualizarKpis();
  }, 4000);

  /* ==============================================================
     15. ANIMACIONES GSAP
     ============================================================== */

  function initGsap() {
    if (!window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    // Burbujas decorativas (reducidas para rendimiento)
    const cont = $('#bubbles');
    for (let i = 0; i < 10; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      const size = randInt(8, 34);
      b.style.width = size + 'px'; b.style.height = size + 'px';
      b.style.left = rand(0, 100) + '%';
      b.style.animationDuration = rand(16, 40) + 's';
      b.style.animationDelay = (-rand(0, 30)) + 's';
      cont.appendChild(b);
    }

    // Timeline del hero.
    // Se usa fromTo con valores explicitos: el tween no depende del valor final
    // registrado en el momento de crearse, asi el resultado es siempre determinista.
    const tl = gsap.timeline({ delay: 0.15, autoRemoveChildren: false });
    tl.fromTo('.topbar', { y: -70, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', clearProps: 'transform' })
      .fromTo('.hero .pill', { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', clearProps: 'transform' }, '-=0.45')
      .fromTo('.hero-title .line', { y: 46, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out', clearProps: 'transform' }, '-=0.4')
      .fromTo('.hero-sub', { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', clearProps: 'transform' }, '-=0.55')
      .fromTo('.hero-actions .btn', { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.6)', clearProps: 'transform' }, '-=0.45')
      .fromTo('.hero-stats .stat', { y: 34, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.09, ease: 'back.out(1.5)', clearProps: 'transform' }, '-=0.4')
      .fromTo('.hero-visual', { scale: 0.9, opacity: 0, x: 40 },
        { scale: 1, opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform' }, '-=0.9')
      .fromTo('.float-badge', { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(2)', clearProps: 'transform' }, '-=0.4');

    // Contadores
    function animarContadores() {
      $$('.counter').forEach(el => {
        const target = parseFloat(el.dataset.target || '0');
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.9, ease: 'power2.out',
          onUpdate() { el.textContent = Math.round(obj.v).toLocaleString('es-CO'); }
        });
      });
    }
    ScrollTrigger.create({ trigger: '#heroStats', start: 'top 92%', once: true, onEnter: animarContadores });

    // Revelado por scroll
    gsap.utils.toArray('.section-head, .kpi, .card, .route-card, .stop-item, .unit-card').forEach(el => {
      gsap.fromTo(el, { y: 34, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', clearProps: 'transform',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
    });

    // Parallax suave del fondo
    gsap.to('.sun-glow', { y: 120, scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom top', scrub: 1 } });
    gsap.to('.hills', { y: -40, scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom top', scrub: 1 } });

    // Nav activo según sección
    const secciones = ['inicio', 'panel', 'rutas', 'unidades', 'paradas', 'incidencias', 'conductor'];
    secciones.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: 'top 45%', end: 'bottom 45%',
        onToggle: (self) => {
          if (!self.isActive) return;
          $$('.m-link').forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
        }
      });
    });

    // Anillos KPI
    gsap.fromTo('.ring', { scale: 0.6, opacity: 0 },
      {
        scale: 1, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'back.out(2)',
        scrollTrigger: { trigger: '.kpi-row', start: 'top 88%', once: true }
      });

    // Red de seguridad: si algun motor deja un bloque del hero en opacidad 0, se restaura
    const seguridad = '.topbar, .hero .pill, .hero-title .line, .hero-sub, .hero-actions .btn, .hero-stats .stat, .hero-visual, .float-badge';
    setTimeout(() => {
      $$(seguridad).forEach(el => {
        if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
          gsap.set(el, { clearProps: 'opacity,transform' });
        }
      });
    }, 5000);
  }

  /* ==============================================================
     16. MENÚ MÓVIL + INICIO
     ============================================================== */

  $('#burger').addEventListener('click', () => $('#menu').classList.toggle('open'));
  $$('.m-link').forEach(l => l.addEventListener('click', () => $('#menu').classList.remove('open')));

  function init() {
    renderTrafico();
    renderRutaList();
    renderUnidades();
    renderParadas('');
    renderHeat();
    renderAlertas();
    generarAlertas(6);
    renderAlertas();
    actualizarKpis();
    renderIncidentes();
    construirMapa();
    construirMiniMapa();
    requestAnimationFrame(moverUnidades);
    initGsap();

    // Retraso de aparición del loader
    setTimeout(() => {
      const l = $('#loader');
      l.classList.add('hidden');
      if (window.gsap) gsap.to(l, { opacity: 0, duration: 0.6, onComplete: () => l.remove() });
      else setTimeout(() => l.remove(), 600);
    }, 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();