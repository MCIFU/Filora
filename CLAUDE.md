# Filora

App local para llevar el registro de las películas que veo, con Excel sincronizado.

- Fuente de verdad: `data/db.json`. El Excel `Filora.xlsx` se regenera solo en cada cambio (no editarlo mientras la app escribe; si se edita a mano, importarlo desde Ajustes o `python tools/excel.py importar`).
- El Excel original del usuario (`C:\Users\PC GAMING\Downloads\Películas.xlsx`) NO se toca nunca.
- Proyecto en `C:\AI\PROYECTOS\pelis` · repo https://github.com/MCIFU/Filora
- Arrancar: `Iniciar.bat` o `python server.py` → http://localhost:8765
- Registrar desde el chat: `python tools/pelis.py vista "<título>" <nota> --lugar "<cine o plataforma>" --resena "..."`
  (autocompleta datos y póster con Wikidata, quita de pendientes, hace copia y regenera el Excel).
- Otros: `pelis.py nota`, `pelis.py buscar`, `pelis.py pendiente`, `pelis.py excel`.
- Cartelera (sesiones) y estrenos: `tools/cartelera.py` (FilmAffinity) → `data/cartelera.json`, `data/estrenos.json`, `data/fa_cache.json`. Lo ejecuta a diario GitHub Actions (`.github/workflows/cartelera.yml`) y hace commit → Netlify republica. FA limita peticiones (429): no machacarlo desde local.
- IMPORTANTE al subir cambios: `git pull --rebase` antes de `git push` (el bot hace commits diarios). Si hay conflicto en esos 3 ficheros de datos, quedarse con la versión remota.
- Cines del usuario: Ocine Premium Los Fresnos ("Elocine", FA id 1269) y Yelmo Ocimax (FA id 402), en Gijón. Los de Oviedo están como secundarios.
- Recomendaciones: `tools/catalogo_recomendaciones.txt` (título ES | original | año | director | país | géneros | prestigio). Tras añadir líneas, `python tools/enriquecer.py --rapido`.
- Wikimedia limita peticiones: usar `tools/bulk.py` (SPARQL por lotes) antes que búsquedas una a una.
- Escala de notas: 0–10 con un decimal.
- Web pública: Vercel (cuenta vercel.com/mcifu; `vercel.json` publica `app/`, ejecuta `tools/build_static.py` y la API está en `api/cinemateca.js` con Vercel Blob + variable EDIT_PIN). Netlify quedó sin créditos y está abandonado (sus ficheros se conservan). La lógica compartida está en `lib/filora.mjs` (pruebas: `npm test`).
- Taquilla: `tools/taquilla.py` (Box Office Mojo por id IMDb); el servidor local la consulta sola al añadir una película.
- Diseño «proyector» (tema oscuro por defecto y claro automático o con el botón de la cabecera; PWA con app/sw.js) (app/styles.css): fondo terciopelo #160d10, papel #f1e6d0, rojo telón #c8102e, bombilla #ffc94a (con cuentagotas), verde salida para notas altas. Tipos: Big Shoulders Display (títulos, mayúsculas), Sofia Sans Extra Condensed (créditos), Instrument Sans (texto). Elementos propios: tiras de celuloide en la portada, entradas de cine en papel (sesiones/estrenos), libro de registro en papel (Añadir). Evitar: tarjetas redondeadas genéricas, etiquetas redundantes sobre títulos, flechas «→», degradados decorativos.
- Revisar diseño con capturas: Edge sin ventana (`msedge --headless=new --screenshot=... --window-size=1440,H --user-data-dir=<carpeta nueva cada vez>`); el ancho mínimo real es ~500 px, para móvil usar el panel del navegador con preset mobile.
- Enlace directo a una ficha: `#/coleccion?ficha=<id>`.

- Cuentas (web): `/api/registro` y `/api/entrar` devuelven una sesión firmada (`lib/cuentas.mjs`, scrypt + HMAC, 180 días). Cada usuario tiene `filora/usuarios/<usuario>/<carpeta aleatoria>/datos.json` en Blob; sin sesión se sirve la colección del dueño. Opcional: variable `AUTH_SECRET` (si no, se genera y guarda en Blob). Pruebas: `npm test`.
- Privacidad: la colección NO está en el repo (data/db.json en .gitignore). Vive en data/local/db.json del PC y en Blob (filora/db.json para la cuenta mcifu); el PC la sube con el PIN y la web permite importar una copia .json. Sin sesión /api/db devuelve una colección vacía.
- Cines: catálogo `data/cines_es.json` (634 cines de FilmAffinity con coordenadas de su ciudad, `python tools/cines.py`). Cada usuario elige los suyos (`preferencias.cines` en su colección; sin cuenta, `localStorage`). La web avisa de los cines elegidos en `POST /api/demanda` y `tools/cartelera.py` descarga cada 3 horas (7:00–22:00) los pedidos en los últimos 30 días (máx. 150); un cine nuevo lanza la descarga al momento si Vercel tiene `GH_DISPATCH_TOKEN` (clave de GitHub con «Actions: write» solo en MCIFU/Filora). No hay cines por defecto.
- Notas externas y premios (app/extras.js): IMDb desde datasets oficiales troceados en app/data/imdb/NN.json (tools/imdb_notas.py, al publicar); FA/LB/RT/SensaCine vía GET /api/notas (lib/notas.mjs, caché Vercel 1 día si completa); premios por SPARQL de Wikidata en el navegador. Todo se cachea en localStorage, no en Blob.
- Importar (app/extras.js): .zip de Letterboxd, .csv de IMDb (notas/series/watchlist) y CSV genérico; completa con Wikidata y guarda con /api/sync. FilmAffinity, RT y SensaCine no permiten exportar.
