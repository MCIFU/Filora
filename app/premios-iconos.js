/* Filora · estatuillas de los premios, dibujadas desde cero (inspiradas en los trofeos reales).
   Lienzo 40 × 64. Metal con degradado propio en cada dibujo; los colores salen de variables CSS
   (--e1 brillo, --e2 tono, --e3 sombra; --b1/--b2 peanas), así se pueden ver doradas o apagadas. */
let ESTATUILLA_N = 0;
const ESTATUILLAS = {
  // Óscar: caballero art déco con los brazos cruzados sobre la espada, de pie sobre un rollo de película
  oscar: (o) => `
    <path fill="url(#${o}m)" d="M20 2.2c1.9 0 3.2 1.4 3.2 3.4 0 1.4-.6 2.6-1.5 3.1l.2 1.3c1.7.4 2.9 1.4 3.2 3l.2 4.3-1.1 2.6.4 4.6-.8 5.7.2 6.4-.9 6.5h-6.2l-.9-6.5.2-6.4-.8-5.7.4-4.6-1.1-2.6.2-4.3c.3-1.6 1.5-2.6 3.2-3l.2-1.3c-.9-.5-1.5-1.7-1.5-3.1 0-2 1.3-3.4 3.2-3.4z"/>
    <path fill="url(#${o}s)" d="M16.4 17.6c1.2 1.3 2.4 1.9 3.6 1.9s2.4-.6 3.6-1.9l-.3 2.2c-1 .9-2.1 1.4-3.3 1.4s-2.3-.5-3.3-1.4z"/>
    <path fill="url(#${o}s)" d="M19.4 19.4h1.2v20.4h-1.2z" opacity=".55"/>
    <path fill="url(#${o}h)" d="M18.2 3.8c.6-.7 1.5-1 2.3-.8-.9.5-1.4 1.5-1.4 2.7l-.8.4c-.4-.8-.4-1.7-.1-2.3z" opacity=".8"/>
    <path fill="url(#${o}h)" d="M17.6 21.6l.6 6.2-.5 6.4.5 5.6h.9l-.4-5.6.5-6.4-.6-6.2z" opacity=".55"/>
    <ellipse cx="20" cy="45.2" rx="7.6" ry="1.9" fill="url(#${o}s)"/>
    <path fill="url(#${o}m)" d="M12.4 45.2v1.6c0 1.1 3.4 2 7.6 2s7.6-.9 7.6-2v-1.6c0 1.1-3.4 2-7.6 2s-7.6-.9-7.6-2z"/>
    <g fill="url(#${o}s)" opacity=".7"><circle cx="15.6" cy="46.3" r=".7"/><circle cx="20" cy="47" r=".7"/><circle cx="24.4" cy="46.3" r=".7"/></g>
    <path fill="url(#${o}b)" d="M10.5 49h19l1 2.2h-21z"/>
    <path fill="url(#${o}b)" d="M8.6 51.6h22.8v10.2c0 .7-.5 1.2-1.2 1.2H9.8c-.7 0-1.2-.5-1.2-1.2z"/>
    <path d="M9.6 52.6h20.8" stroke="rgba(255,255,255,.18)" stroke-width=".6"/>`,

  // Globo de Oro: globo terráqueo dorado rodeado por una tira de película, sobre columna estriada
  globo: (o) => `
    <circle cx="20" cy="17" r="11.2" fill="url(#${o}r)"/>
    <g fill="none" stroke="url(#${o}s)" stroke-width=".8" opacity=".7"><ellipse cx="20" cy="17" rx="4.6" ry="11.2"/><ellipse cx="20" cy="17" rx="8.6" ry="11.2"/><path d="M8.8 17h22.4M10 11.6h20M10 22.4h20"/></g>
    <path fill="url(#${o}h)" opacity=".55" d="M14 9.4c2-1.8 4.5-2.7 7-2.5-3 .9-5.4 2.7-6.8 5.2z"/>
    <path fill="url(#${o}m)" d="M5.8 19.4c2.3 4.6 8 7.6 14.2 7.6s11.9-3 14.2-7.6l1.8 1.3c-2.8 5.6-9.2 9.1-16 9.1s-13.2-3.5-16-9.1z"/>
    <g fill="url(#${o}b)"><rect x="9" y="24.6" width="1.6" height="1.2" rx=".3" transform="rotate(32 9.8 25.2)"/><rect x="13.4" y="27.3" width="1.6" height="1.2" rx=".3" transform="rotate(18 14.2 27.9)"/><rect x="19.2" y="28.4" width="1.6" height="1.2" rx=".3"/><rect x="25" y="27.3" width="1.6" height="1.2" rx=".3" transform="rotate(-18 25.8 27.9)"/><rect x="29.4" y="24.6" width="1.6" height="1.2" rx=".3" transform="rotate(-32 30.2 25.2)"/></g>
    <path fill="url(#${o}m)" d="M17.4 30.6h5.2l.8 2.2-.6 9.4h-5.6l-.6-9.4z"/>
    <g stroke="url(#${o}s)" stroke-width=".6" opacity=".6"><path d="M18.9 33v8.6M21.1 33v8.6"/></g>
    <path fill="url(#${o}m)" d="M13.2 42.2h13.6l1.2 2.4H12z"/>
    <path fill="url(#${o}b)" d="M10 45h20l1.6 16.6c.1.8-.5 1.4-1.3 1.4H9.7c-.8 0-1.4-.6-1.3-1.4z"/>
    <path d="M11 46.4h18" stroke="rgba(255,255,255,.18)" stroke-width=".6"/>`,

  // Emmy: mujer alada que sostiene en alto un átomo, sobre peana cilíndrica
  emmy: (o) => `
    <g fill="none" stroke="url(#${o}m)" stroke-width="1.1"><ellipse cx="20" cy="6.6" rx="6.4" ry="2.3"/><ellipse cx="20" cy="6.6" rx="6.4" ry="2.3" transform="rotate(60 20 6.6)"/><ellipse cx="20" cy="6.6" rx="6.4" ry="2.3" transform="rotate(-60 20 6.6)"/></g>
    <circle cx="20" cy="6.6" r="1.5" fill="url(#${o}r)"/>
    <path fill="url(#${o}m)" d="M18.9 9.8h2.2l.3 4.3.6 1.4c.8 1.2 1 2.7.6 4.2l-.6 3.4.6 6.6.4 9.6h-6l.4-9.6.6-6.6-.6-3.4c-.4-1.5-.2-3 .6-4.2l.6-1.4z"/>
    <path fill="url(#${o}m)" d="M17.2 18.4C13 17.2 9.6 13.8 7.8 8.8l1.8.4c-.4 1.4.4 2.8 1.6 3.6-.6 1.2.2 2.4 1.4 3 0 1.1 1.4 2 3.2 2.2zM22.8 18.4c4.2-1.2 7.6-4.6 9.4-9.6l-1.8.4c.4 1.4-.4 2.8-1.6 3.6.6 1.2-.2 2.4-1.4 3 0 1.1-1.4 2-3.2 2.2z"/>
    <g stroke="url(#${o}s)" stroke-width=".5" opacity=".7" fill="none"><path d="M10 10.6l5 5.2M11.6 13.6l3.8 2.8M28 10.6l-5 5.2M26.4 13.6l-3.8 2.8"/></g>
    <path fill="url(#${o}h)" opacity=".6" d="M19.2 20c.4 2.6.4 5.4 0 8.4l.3 10.2h.6l-.1-10.2c.3-3 .2-5.8-.2-8.4z"/>
    <ellipse cx="20" cy="40.6" rx="5.6" ry="1.4" fill="url(#${o}s)"/>
    <ellipse cx="20" cy="44.4" rx="8" ry="2" fill="url(#${o}b)"/>
    <path fill="url(#${o}b)" d="M12 44.4v15.4c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V44.4c0 1.8-3.6 3.2-8 3.2s-8-1.4-8-3.2z"/>
    <path d="M14.4 47.6v13.6" stroke="rgba(255,255,255,.14)" stroke-width="1.2"/>`,

  // BAFTA: máscara teatral de frente (diseño de Mitzi Cunliffe), sobre soporte y peana
  bafta: (o) => `
    <path fill="url(#${o}m)" fill-rule="evenodd" d="M7.4 6.4C11.4 4.4 15.6 3.4 20 3.4s8.6 1 12.6 3l-.2 13.4c-.2 9.4-4.8 16.8-12.4 19.8C12.4 36.6 7.8 29.2 7.6 19.8z
      M11.6 15.4c1.7-1.9 4.6-2.2 6.3-.4-1.8 2.2-4.4 2.5-6.3.4zM22.1 15c1.7-1.8 4.6-1.5 6.3.4-1.9 2.1-4.5 1.8-6.3-.4zM15.6 28.4c2.9 1.5 5.9 1.5 8.8 0-1 3.1-2.6 4.6-4.4 4.6s-3.4-1.5-4.4-4.6z"/>
    <path fill="url(#${o}s)" d="M20 15.2c.8 0 1.2 2.6 1.4 6.4.1 1.4-.6 2.2-1.4 2.2s-1.5-.8-1.4-2.2c.2-3.8.6-6.4 1.4-6.4z" opacity=".75"/>
    <path fill="url(#${o}s)" d="M10.6 12.6c2.4-1.6 5.4-2 7.6-1.1M21.8 11.5c2.2-.9 5.2-.5 7.6 1.1" opacity=".0"/>
    <path fill="none" stroke="url(#${o}s)" stroke-width=".9" opacity=".7" d="M10.8 12.8c2.4-1.5 5.2-1.8 7.4-.9M21.8 11.9c2.2-.9 5-.6 7.4.9"/>
    <path fill="url(#${o}h)" opacity=".5" d="M9.4 8.2c2.4-1.2 5-1.9 7.6-2.2-2.8 1-5.2 2.6-7 4.6z"/>
    <path fill="url(#${o}m)" d="M18.6 40.4h2.8v5h-2.8z"/>
    <path fill="url(#${o}b)" d="M11.4 45.4h17.2l1 2.6H10.4z"/>
    <path fill="url(#${o}b)" d="M9.2 48.4h21.6l.9 13.4c.1.7-.5 1.2-1.2 1.2H9.5c-.7 0-1.3-.5-1.2-1.2z"/>`,

  // Cannes: Palma de Oro (hoja de palmera de 19 foliolos) sobre cojín de cristal tallado
  cannes: (o) => `
    <path fill="none" stroke="url(#${o}m)" stroke-width="1.3" stroke-linecap="round" d="M20.6 42c-1.6-9.4-1.4-20.2 2.2-31.6 .6-1.8 1.4-3.4 2.4-4.8"/>
    <g fill="url(#${o}m)">
      ${[[25.2, 6.4, -1], [24.2, 9.2, 1], [23.6, 12.2, -1], [23, 15.4, 1], [22.4, 18.8, -1], [21.9, 22.2, 1], [21.5, 25.8, -1], [21.2, 29.4, 1], [21, 33, -1]].map(([x, y, l]) =>
        `<path d="M${x} ${y}c${-3.6 * 1} ${-0.6} ${-6.8} ${0.8} ${-9.2} ${3.2} ${3.4} ${-0.4} ${6.4} ${-1.4} ${9.2} ${-3.2}z"/><path d="M${x} ${y}c${3.4} ${-1.4} ${6.8} ${-1.2} ${9.6} ${0.8} ${-3.4} ${0.4} ${-6.6} ${0.2} ${-9.6} ${-0.8}z"/>`).join("")}
      <path d="M25.6 5.4c.8-1.6 2-2.8 3.6-3.4-.6 1.6-1.6 2.8-3 3.8z"/>
    </g>
    <g fill="none" stroke="url(#${o}s)" stroke-width=".35" opacity=".6"><path d="M16.4 9.4l7.6-2.4M15.2 15.2l7.8-2.4M14.2 21.4l7.8-2.2M13.6 27.6l7.8-1.8M13.8 33.8l7.2-1.6"/></g>
    <path fill="url(#${o}c)" d="M8.4 44.4c0-1.6 5.2-2.8 11.6-2.8s11.6 1.2 11.6 2.8l1.4 15.4c.2 1.8-6 3.2-13 3.2S6.8 61.6 7 59.8z"/>
    <path fill="#fff" opacity=".35" d="M10.6 45.6l2.6-1 1.2 15.8-2.6-.4zM24.4 44.4l2.2.4-.6 16.2-2 .2z"/>
    <ellipse cx="20" cy="44.4" rx="11.6" ry="2.8" fill="#fff" opacity=".18"/>`,

  // César: la «compresión» de metal de César Baldaccini, un bloque prensado sobre peana con placa
  cesar: (o) => `
    <path fill="url(#${o}m)" d="M13 6.4l3.4-2 3.2 1 3.6-1.4 3.8 1.8-.8 4.4 1.1 4.6-1.2 4.4 1.1 5-.9 4.8 1 5-1 4.6.7 4.4-3.8 1.6-3.4-1.2-3.4 1.3-3.4-1.5.8-4.6-1-4.8 1-4.8-1-5.1.9-4.6-1.1-4.8 1-4.4z"/>
    <g fill="url(#${o}s)" opacity=".75">
      <path d="M14.6 9.6l3.2 1.6-1 2.8 3.4 1.2 3.6-1.8.8 3.2-3.4 1.4-3.8-1-2.6 1.6z"/>
      <path d="M15 22.4l3.6-1.2 2.4 2.2 3.8-.8.2 3.4-3.2.6-3.4-1.6-3 1.4z"/>
      <path d="M14.6 33.6l3.8.8 2.6-1.6 3.4 1.4-.6 3-3.4-.8-2.8 1.4-3.2-.6z"/>
    </g>
    <g fill="url(#${o}h)" opacity=".6"><path d="M16 5.4l1.6.6-.6 4-1.4-.8zM21.4 16.6l2.4-.8.6 4-2.4.6zM16.4 27.6l2-.4.4 3.6-2 .4z"/></g>
    <path fill="none" stroke="url(#${o}s)" stroke-width=".5" opacity=".6" d="M14.4 18.6l11.2-.4M14.2 29.8l11.6.6M19.8 5.6l.6 37"/>
    <path fill="url(#${o}b)" d="M10.4 45.4h19.2l1 2.4H9.4z"/>
    <path fill="url(#${o}b)" d="M8.8 48.2h22.4l.8 13.6c0 .7-.5 1.2-1.2 1.2H9.2c-.7 0-1.2-.5-1.2-1.2z"/>
    <rect x="14" y="52.8" width="12" height="4.4" rx=".6" fill="url(#${o}m)" opacity=".85"/>`,

  // Cine Europeo: figura femenina estilizada con los brazos alzados en V, sobre peana
  europeo: (o) => `
    <ellipse cx="20" cy="8.4" rx="2.6" ry="3" fill="url(#${o}m)"/>
    <path fill="url(#${o}m)" d="M18.4 11.8h3.2l.4 2 5-7.6c.4-.6 1.2-.7 1.6-.2.4.4.4 1 0 1.5l-5.4 7.6-.4 4.8c1.8 4.2 2.9 9.4 3.3 15.6l.2 5.5H13.7l.2-5.5c.4-6.2 1.5-11.4 3.3-15.6l-.4-4.8-5.4-7.6c-.4-.5-.4-1.1 0-1.5.4-.5 1.2-.4 1.6.2l5 7.6z"/>
    <path fill="url(#${o}s)" opacity=".6" d="M21.6 21c1.4 4.4 2.2 9.6 2.4 16l.1 4.5h-1.6c.2-6.8-.2-13.6-.9-20.5z"/>
    <path fill="url(#${o}h)" opacity=".55" d="M17.4 21.6c-1 4.2-1.6 9-1.8 14.6l-.1 5.3h.9c0-6.4.4-13.4 1-19.9z"/>
    <path fill="url(#${o}b)" d="M12.4 45.6h15.2l1.2 2.4H11.2z"/>
    <path fill="url(#${o}b)" d="M10.4 48.4h19.2l1 13.4c.1.7-.5 1.2-1.2 1.2H10.6c-.7 0-1.3-.5-1.2-1.2z"/>`,

  // Feroz: cabeza de lobo con antifaz, de perfil y aullando al frente, sobre peana
  feroz: (o) => `
    <path fill="url(#${o}m)" d="M12.6 41.2c-1.4-6.4-.8-12.2 1.8-17.2-1.6-2.1-2-4.6-1.1-7.4l1.6-7.8 3.6 5.8c1.5-.4 3-.4 4.6-.1l4.2-6.2.6 8.2c1.3 1.4 2.3 3 2.9 4.8l6.8 5c.7.6.7 1.6 0 2.1l-2.2 1.7c-1.9 1.4-4.2 1.7-6.4 1.1-1 3.9-.6 8.4 1 13.4-5.8 1.5-11.9 1.9-17.4-.4z"/>
    <path fill="url(#${o}b)" d="M15.4 20.2c3.6-2.6 8.8-3.6 14.4-1.6l-.6 3.4c-1.8-.6-3.6-.8-5.3-.8l-.2 1.1c-1.4.4-2.7.2-3.6-.7l.1-.2c-1.6.4-3 1-4.2 1.9z"/>
    <path fill="url(#${o}h)" d="M23.4 21.4c.8-.5 1.8-.5 2.6 0-.7.7-1.8.8-2.6 0z"/>
    <path fill="url(#${o}s)" opacity=".7" d="M15 9.6l2 5.4-1.4.8zM26 7.4l.5 6.6-1.6-.6z"/>
    <path fill="none" stroke="url(#${o}s)" stroke-width=".6" opacity=".6" d="M31.6 24.4c-1.4.8-3.4 1-5.2.4M14.6 28c1.6 3.6 1.8 7.8.8 12.4M18.4 30.4c.8 3 .8 6.2.2 9.6"/>
    <path fill="url(#${o}b)" d="M10.6 43.6h18.8l1 2.4h-20.8z"/>
    <path fill="url(#${o}b)" d="M9 46.4h22l.9 15.4c0 .7-.5 1.2-1.2 1.2H9.3c-.7 0-1.2-.5-1.2-1.2z"/>`,

  // Goya: busto del pintor (pelo abundante, patillas, levita y pañuelo al cuello) sobre peana
  goya: (o) => `
    <path fill="url(#${o}m)" d="M20 4.2c5.4 0 9 3.8 9 9.2 0 1.6-.3 3-.8 4.2 1.1 1 1.4 2.4.8 3.6-.5 1-1.5 1.5-2.6 1.4-1.1 3-3.6 4.9-6.4 4.9s-5.3-1.9-6.4-4.9c-1.1.1-2.1-.4-2.6-1.4-.6-1.2-.3-2.6.8-3.6-.5-1.2-.8-2.6-.8-4.2 0-5.4 3.6-9.2 9-9.2z"/>
    <path fill="url(#${o}s)" opacity=".8" d="M11.6 12.4c.6-4.6 3.8-7.2 8.4-7.2 4.4 0 7.6 2.4 8.4 6.6-1.6-2-3.8-3-6.4-3.2-1 1.2-2.6 1.6-4.4 1.4-2.2-.2-4.4.6-6 2.4zM12.6 17.4c.6 1.6.8 3.2.6 4.8l-1-1c-.2-1.4 0-2.6.4-3.8zM27.4 17.4c-.6 1.6-.8 3.2-.6 4.8l1-1c.2-1.4 0-2.6-.4-3.8z"/>
    <path fill="url(#${o}h)" opacity=".55" d="M15 8.6c1.4-1.6 3.4-2.4 5.6-2.4-2 .8-3.6 2.2-4.4 4.2z"/>
    <path fill="url(#${o}m)" d="M17 26.8h6l.6 2.4c4.4.8 7.6 3.4 8.6 7.4l.6 3H7.2l.6-3c1-4 4.2-6.6 8.6-7.4z"/>
    <path fill="url(#${o}s)" opacity=".8" d="M17.6 29.2l2.4 3.4 2.4-3.4.8 1-3.2 5.4-3.2-5.4zM10.4 33.6c1.6 1.6 3.6 2.6 5.8 3l-.4 2.6h-6.2zM29.6 33.6c-1.6 1.6-3.6 2.6-5.8 3l.4 2.6h6.2z"/>
    <path fill="url(#${o}b)" d="M12.6 40.6h14.8l1 2.6H11.6z"/>
    <path fill="url(#${o}b)" d="M10.2 43.6h19.6l1.4 18.2c.1.7-.5 1.2-1.2 1.2H10c-.7 0-1.3-.5-1.2-1.2z"/>
    <path d="M11.4 45.2h17.2" stroke="rgba(255,255,255,.18)" stroke-width=".6"/>`,

  // Laurel para el resto de premios (festivales y demás)
  laurel: (o) => `
    <g fill="none" stroke="url(#${o}m)" stroke-width="1.8" stroke-linecap="round"><path d="M14.4 52C6.4 44 4.8 31 10.6 18.6M25.6 52c8-8 9.6-21 3.8-33.4"/></g>
    <g fill="url(#${o}m)">${[[9.6, 44], [7.4, 37], [6.8, 30], [7.6, 23.4], [9.6, 17.4]].map(([x, y], i) =>
      `<path d="M${x} ${y}c-3-.3-5-2-5.6-4.8 2.9.3 4.8 2 5.6 4.8z"/><path d="M${40 - x} ${y}c3-.3 5-2 5.6-4.8-2.9.3-4.8 2-5.6 4.8z"/><path d="M${x + 0.6} ${y - 1.4}c-.4-2.8.8-5 3.4-6.2-.2 2.8-1.4 4.8-3.4 6.2z" opacity=".85"/><path d="M${39.4 - x} ${y - 1.4}c.4-2.8-.8-5-3.4-6.2.2 2.8 1.4 4.8 3.4 6.2z" opacity=".85"/>`).join("")}</g>
    <path fill="url(#${o}b)" d="M13 54h14l1 3H12z"/>`,
};
function estatuilla(f) {
  const o = "est" + ++ESTATUILLA_N;
  const dibujo = (ESTATUILLAS[f] || ESTATUILLAS.laurel)(o);
  return `<svg viewBox="0 0 40 64" aria-hidden="true" class="estatuilla"><defs>
    <linearGradient id="${o}m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--e3,#9a6b16)"/><stop offset=".35" style="stop-color:var(--e1,#fbe7a1)"/><stop offset=".6" style="stop-color:var(--e2,#e0b44a)"/><stop offset="1" style="stop-color:var(--e3,#9a6b16)"/></linearGradient>
    <linearGradient id="${o}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--e3,#9a6b16)"/><stop offset="1" style="stop-color:var(--e4,#6b4a0f)"/></linearGradient>
    <linearGradient id="${o}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="${o}r" cx=".35" cy=".3" r=".8"><stop offset="0" style="stop-color:var(--e1,#fbe7a1)"/><stop offset=".55" style="stop-color:var(--e2,#e0b44a)"/><stop offset="1" style="stop-color:var(--e3,#9a6b16)"/></radialGradient>
    <linearGradient id="${o}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--b2,#15121f)"/><stop offset=".4" style="stop-color:var(--b1,#3a3550)"/><stop offset="1" style="stop-color:var(--b2,#15121f)"/></linearGradient>
    <linearGradient id="${o}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f2ff" stop-opacity=".75"/><stop offset=".5" stop-color="#9fc8e6" stop-opacity=".45"/><stop offset="1" stop-color="#5b86a8" stop-opacity=".7"/></linearGradient>
  </defs>${dibujo}</svg>`;
}
