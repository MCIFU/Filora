/* Filora · estatuillas de los premios dibujadas a mano (siluetas inspiradas en los trofeos reales).
   Todas en un lienzo de 40 × 64, rellenas con el color del texto (dorado en la ficha). */
const ESTATUILLAS = {
  // Óscar: caballero con los brazos cruzados sobre la espada, de pie sobre un rollo de película
  oscar: `<ellipse cx="20" cy="6.2" rx="2.9" ry="3.4"/>
    <path d="M16.2 11.2c1.2-.9 2.4-1.3 3.8-1.3s2.6.4 3.8 1.3l.5 6.2-1.2 3 .6 5.8-.7 7.6-.9 9.4h-4.2l-.9-9.4-.7-7.6.6-5.8-1.2-3z"/>
    <rect x="13.5" y="44" width="13" height="3.2" rx="1.2"/>
    <path d="M11.5 47.6h17l1 3.2H10.5z"/>
    <rect x="9" y="51" width="22" height="11" rx="1.5"/>
    <g fill="var(--sala, #13102e)" opacity=".55"><circle cx="14" cy="56.5" r="1.4"/><circle cx="20" cy="56.5" r="1.4"/><circle cx="26" cy="56.5" r="1.4"/></g>`,

  // Goya: busto del pintor sobre peana
  goya: `<path d="M20 6.5c4.8 0 8.3 3.6 8.3 8.6 0 2.2-.6 4.2-1.6 5.8 1.3.8 1.9 2 1.6 3.2-.4 1.4-1.6 2-2.9 1.8-1 2.3-3 3.8-5.4 3.8s-4.4-1.5-5.4-3.8c-1.3.2-2.5-.4-2.9-1.8-.3-1.2.3-2.4 1.6-3.2-1-1.6-1.6-3.6-1.6-5.8 0-5 3.5-8.6 8.3-8.6z"/>
    <path d="M17.2 29.5h5.6l.6 3.4c4.6.9 8.1 3.6 9.1 7.9l.5 2.6H7l.5-2.6c1-4.3 4.5-7 9.1-7.9z"/>
    <rect x="13" y="43.6" width="14" height="3.4" rx="1"/>
    <path d="M11 47.4h18l1.5 14.6h-21z"/>`,

  // Globo de Oro: globo terráqueo rodeado por una tira de película, sobre columna
  globo: `<circle cx="20" cy="19" r="11"/>
    <g fill="none" stroke="var(--sala, #13102e)" stroke-width="1.1" opacity=".55"><ellipse cx="20" cy="19" rx="4.6" ry="11"/><path d="M9.3 15.5h21.4M9.3 22.5h21.4"/></g>
    <path d="M6.5 22.5c2.5 4.2 7.6 6.6 13.5 6.6s11-2.4 13.5-6.6l1.4 1.2c-2.9 5-8.6 8-14.9 8s-12-3-14.9-8z"/>
    <path d="M17.6 31.5h4.8l1.4 10.5h-7.6z"/>
    <rect x="13" y="42" width="14" height="3.4" rx="1"/>
    <path d="M10.5 45.8h19l1.5 16.2H9z"/>`,

  // BAFTA: máscara teatral de frente, sobre soporte
  bafta: `<path fill-rule="evenodd" d="M8 7.5c3.9-1.6 8-2.4 12-2.4s8.1.8 12 2.4l-.6 15.6c-.4 9-4.8 16.3-11.4 18.8C13.4 39.4 9 32.1 8.6 23.1zm5 10.6c1.2-1.4 3.4-1.6 4.8-.3-1.6 1.6-3.4 1.7-4.8.3zm9.2-.3c1.4-1.3 3.6-1.1 4.8.3-1.4 1.4-3.2 1.3-4.8-.3zm-6 11.6c2.4 1.3 5.2 1.3 7.6 0-1 2.4-2.3 3.4-3.8 3.4s-2.8-1-3.8-3.4z"/>
    <rect x="18.6" y="41" width="2.8" height="6"/>
    <rect x="12" y="47" width="16" height="3.2" rx="1"/>
    <path d="M10 50.6h20l1.4 11.4H8.6z"/>`,

  // Cannes: Palma de Oro (hoja de palmera curvada) sobre bloque de cristal
  cannes: `<path d="M20.6 44.2c-1.4-9.6-.8-21.4 3.8-33.5l1.3.4c-4.2 11.8-4.8 23.2-3.5 32.9z"/>
    <g><path d="M24.3 11.5c-3.5-2.3-7.5-2.6-11.6-.9 4 .4 7.8 1.2 11.6.9z"/><path d="M24.6 11.2c2.6-3.1 6.3-4.4 10.6-3.8-3.6 1.6-7.1 2.8-10.6 3.8z"/>
    <path d="M23.4 16.4c-3.9-1.9-8.1-1.8-12 .3 4.1-.1 8 .3 12-.3z"/><path d="M23.7 15.9c2.9-2.8 6.8-3.7 11-2.6-3.8 1.2-7.4 2-11 2.6z"/>
    <path d="M22.5 21.7c-3.8-1.6-7.9-1.2-11.6 1.1 4-.4 7.8-.4 11.6-1.1z"/><path d="M22.8 21.2c2.7-2.6 6.4-3.3 10.4-2.1-3.6 1-7 1.7-10.4 2.1z"/>
    <path d="M21.9 27.1c-3.4-1.3-7-.8-10.2 1.4 3.5-.5 6.8-.6 10.2-1.4z"/><path d="M22.1 26.6c2.4-2.3 5.6-2.9 9.2-1.8-3.2.8-6.2 1.5-9.2 1.8z"/>
    <path d="M21.6 32.4c-2.9-1-6-.5-8.7 1.4 3-.4 5.8-.6 8.7-1.4z"/><path d="M21.7 32c2-1.9 4.8-2.4 7.8-1.5-2.7.7-5.2 1.2-7.8 1.5z"/></g>
    <path fill-opacity=".45" d="M10 45h20l2 17H8z"/><path d="M10 45h20l.4 3.2H9.6z"/>`,

  // César: la «compresión» de César Baldaccini, un bloque de metal prensado sobre peana
  cesar: `<path d="M13.5 8.2l3-1.7 3.2 1.1 3.4-1.4 3.7 1.6-.6 4.3.9 4.6-1.1 4.4 1 4.9-.8 4.7 1 5-1 4.6.6 4.3-3.6 1.5-3.4-1.2-3.3 1.3-3.3-1.4.7-4.5-.9-4.8 1-4.6-.9-5 .8-4.6-1-4.7.9-4.4z"/>
    <g fill="none" stroke="var(--sala, #13102e)" stroke-width=".9" opacity=".5"><path d="M15 14.5l10 .8M14.6 21.6l10.8-.6M15.2 28.5l10.2.9M14.8 35.5l10.6-.7M19.4 9l.6 32"/></g>
    <rect x="11" y="45" width="18" height="3.2" rx="1"/>
    <path d="M9.5 48.6h21l1 13.4h-23z"/>`,

  // Cine Europeo: figura femenina estilizada con los brazos alzados
  europeo: `<circle cx="20" cy="9" r="3.1"/>
    <path d="M18.3 12.6h3.4l4.6-7.1 1.4.8-4.4 8.1-.6 5.5c1.9 4.9 3.1 11.2 3.4 18.6l.1 4.2h-12.4l.1-4.2c.3-7.4 1.5-13.7 3.4-18.6l-.6-5.5-4.4-8.1 1.4-.8z"/>
    <rect x="12.5" y="43.6" width="15" height="3.2" rx="1"/>
    <path d="M10.5 47.2h19l1.4 14.8H9.1z"/>`,

  // Emmy: mujer alada que sostiene un átomo
  emmy: `<g fill="none" stroke="currentColor" stroke-width="1.3"><ellipse cx="20" cy="6.5" rx="6.5" ry="2.4"/><ellipse cx="20" cy="6.5" rx="6.5" ry="2.4" transform="rotate(60 20 6.5)"/><ellipse cx="20" cy="6.5" rx="6.5" ry="2.4" transform="rotate(-60 20 6.5)"/></g>
    <circle cx="20" cy="6.5" r="1.4"/>
    <path d="M18.6 13.5c.4-1 2.4-1 2.8 0l.6 4.4c3.2-3.8 7.4-6.6 12.6-8.2-1.6 5.6-4.9 10.2-9.8 13.4l-1.6 1.3c1.2 5 1.6 10.6 1.3 16.6l-.3 2.8h-8.4l-.3-2.8c-.3-6 .1-11.6 1.3-16.6l-1.6-1.3c-4.9-3.2-8.2-7.8-9.8-13.4 5.2 1.6 9.4 4.4 12.6 8.2z"/>
    <ellipse cx="20" cy="45.3" rx="7.5" ry="1.8"/>
    <path d="M12.5 45.3v13.4c0 1.8 3.4 3.3 7.5 3.3s7.5-1.5 7.5-3.3V45.3c0 1.8-3.4 3.3-7.5 3.3s-7.5-1.5-7.5-3.3z"/>`,

  // Feroz: silueta de lobo con antifaz, de perfil, sobre peana
  feroz: `<path fill-rule="evenodd" d="M12.5 39.5c-1.2-6-.6-11.4 1.6-16.2-1.4-1.9-1.8-4.3-1-6.9l1.1-6.8 3.4 5.2c1.4-.4 2.8-.4 4.2-.1l3.8-5.6.6 7.5c1.2 1.2 2.1 2.6 2.7 4.3l6.3 4.6c.6.5.6 1.4 0 1.9l-2 1.5c-1.7 1.3-3.8 1.6-5.8 1-.9 3.6-.6 7.8.9 12.4-5.3 1.4-10.8 1.8-16.5-.8zm9.6-17.6c1.6-.6 3.4-.2 4.4 1-1.4.9-3.1.9-4.4-1z"/>
    <path fill="var(--sala, #13102e)" opacity=".55" d="M15.6 21.2c3.2-2.4 8-3.4 13.2-1.6l-.5 3.1c-4.6-1.3-9-.5-12.5 1.6z"/>
    <rect x="11" y="42" width="18" height="3.2" rx="1"/>
    <path d="M9.5 45.6h21l1 16.4h-23z"/>`,
};
// Laurel para el resto de premios (festivales y demás)
ESTATUILLAS.laurel = `<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 52C6 44 4.5 31 10.5 19M26 52c8-8 9.5-21 3.5-33"/></g>
  <g><path d="M9.6 43.5c-3-.2-5-1.9-5.7-4.7 2.9.2 4.8 1.9 5.7 4.7zM7.4 36.4c-2.9-.6-4.6-2.6-4.9-5.4 2.8.6 4.4 2.5 4.9 5.4zM7 29.2c-2.7-1-4-3.2-3.9-6 2.6 1 3.9 3.1 3.9 6zM8.3 22.3c-2.4-1.4-3.3-3.8-2.7-6.5 2.3 1.4 3.2 3.7 2.7 6.5z"/>
  <path d="M30.4 43.5c3-.2 5-1.9 5.7-4.7-2.9.2-4.8 1.9-5.7 4.7zM32.6 36.4c2.9-.6 4.6-2.6 4.9-5.4-2.8.6-4.4 2.5-4.9 5.4zM33 29.2c2.7-1 4-3.2 3.9-6-2.6 1-3.9 3.1-3.9 6zM31.7 22.3c2.4-1.4 3.3-3.8 2.7-6.5-2.3 1.4-3.2 3.7-2.7 6.5z"/></g>
  <path d="M14 55h12v3H14z"/>`;
const estatuilla = (f) => `<svg viewBox="0 0 40 64" fill="currentColor" aria-hidden="true">${ESTATUILLAS[f] || ESTATUILLAS.laurel}</svg>`;
