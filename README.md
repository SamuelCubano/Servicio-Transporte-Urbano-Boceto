# TransUrbano - Servicio de Transporte Urbano

Plataforma de gestion del Servicio de Transporte Urbano: rutas activas, trafico en vivo, unidades disponibles, reporte de incidencias y seguimiento GPS.

## Paleta de Colores

Definida en `:root` de `styles.css`.

### Verdes (identidad principal)
| Variable | Hex | Uso |
|----------|-----|-----|
| --green-900 | #0b3d2e | Texto principal, titulos oscuros |
| --green-700 | #1d7a4c | Botones, acentos, estado OK |
| --green-600 | #2f9e63 | Gradientes primarios, rutas activas |
| --green-500 | #4aa96c | Color base - botones primarios, anillos, chips verdes |
| --green-400 | #6fc48c | Gradientes claros, fondos suaves |
| --green-100 | #dcf3e5 | Fondos muy claros, loader |

### Azules/Celestes (secundario - Sky)
| Variable | Hex | Uso |
|----------|-----|-----|
| --sky-700 | #0b6fa4 | Enlaces, mapas |
| --sky-600 | #1298d4 | Hover botones, acentos |
| --sky-500 | #29b6f6 | Color base cielo - gradientes, live tags, rutas R2 |
| --sky-400 | #4fc3f7 | Gradientes, burbujas fondo |
| --sky-200 | #b3e5fc | Tooltips, fondos sutiles |
| --sky-100 | #e1f5fe | Fondos muy claros |

### Neutros y de apoyo
| Variable | Hex | Uso |
|----------|-----|-----|
| --white | #ffffff | Fondos, glassmorphism |
| --ink | #0e2c22 | Texto principal oscuro |
| --ink-soft | #42655a | Texto secundario, labels |
| --amber | #f5a623 | Advertencias, retrasos, chips warn |
| --red | #e5484d | Critico, errores, emergencias |
| --violet | #8b7cf6 | Ruta R3 (Universidad) |

### Glassmorphism
```css
--glass: rgba(255,255,255,.62);       
--glass-strong: rgba(255,255,255,.82); 
--stroke: rgba(255,255,255,.75);      
```

## GSAP (GreenSock Animation Platform)

**Version:** 3.12.5 (CDN en `index.html`)

### Usos principales en `script.js`:

| Funcion | Animacion GSAP |
|---------|----------------|
| Toasts (`toast()`) | `gsap.from(el, { x: 60, opacity: 0, duration: 0.45, ease: 'back.out(1.6)' })` |
| Modales (`abrirModal/cerrarModal`) | `gsap.fromTo('#modal', { y: 26, scale: 0.96 }, { y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.4)' })` + stagger en contenido |
| Tarjetas Unidades (`renderUnidades`) | `gsap.fromTo(card, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: i * 0.035, ease: 'power2.out' })` |
| Incidencias (`renderIncidentes`) | `gsap.fromTo(li, { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power2.out' })` |
| Sesion conductor | `gsap.fromTo('#cardSession', { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' })` |
| Registro GPS | `gsap.fromTo(tr, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.4, delay: i * 0.08, ease: 'power2.out' })` |
| ScrollTrigger | Dispara `mapa.invalidateSize()` al hacer scroll a `#rutas` |

## Otras Tecnologias Clave

| Libreria | Version | Uso |
|----------|---------|-----|
| Leaflet | 1.9.4 | Mapas interactivos (OpenStreetMap + CARTO basemaps) |
| Google Fonts | - | Fredoka (titulos) + Nunito (cuerpo) |
| CARTO Basemaps | - | Tiles Voyager (claro), Dark Matter (oscuro), OSM estandar - requiere API Key |

## Arquitectura y Estetica

- **Estilo:** Frutiger Aero (verde + azul celeste + blanco, glassmorphism, gloss, sombras suaves)
- **Layout:** CSS Grid + Flexbox, responsive con breakpoints en 1080, 860, 640, 480, 375px
- **Datos simulados:** 8 rutas reales de Caracas, 18 unidades, ~40 paradas, trafico dinamico, alertas automaticas cada 9s
- **Funcionalidades:** Mapa en vivo con buses animados, mini-mapa hero, panel KPIs, reportes incidencias, identificacion tarjeta conductor, registro GPS, botones emergencia/reporte flotantes

## Estructura del Proyecto

```
Servicio-Transporte-Urbano-Boceto/
├── index.html     (593 lineas - estructura + loader inline + CDNs)
├── styles.css     (832+ lineas - diseño completo, variables, responsive)
└── script.js      (1117+ lineas - logica, Leaflet, GSAP, simulacion)
```

## Proyecto

- Universidad - IUJO
- Curso: Ingenieria de Software
- Producto de demostracion
- Datos simulados en el navegador
- Hecho con HTML, CSS, JS y GSAP