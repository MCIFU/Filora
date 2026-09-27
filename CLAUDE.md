# Mi Cinemateca

App local para llevar el registro de las películas que veo, con Excel sincronizado.

- Fuente de verdad: `data/db.json`. El Excel `Mi Cinemateca.xlsx` se regenera solo en cada cambio (no editarlo mientras la app escribe; si se edita a mano, importarlo desde Ajustes o `python tools/excel.py importar`).
- El Excel original del usuario (`C:\Users\PC GAMING\Downloads\Películas.xlsx`) NO se toca nunca.
- Proyecto en `C:\AI\PROYECTOS\pelis` · repo https://github.com/MCIFU/mi-cinemateca
- Arrancar: `Iniciar.bat` o `python server.py` → http://localhost:8765
- Registrar desde el chat: `python tools/pelis.py vista "<título>" <nota> --lugar "<cine o plataforma>" --resena "..."`
  (autocompleta datos y póster con Wikidata, quita de pendientes, hace copia y regenera el Excel).
- Otros: `pelis.py nota`, `pelis.py buscar`, `pelis.py pendiente`, `pelis.py excel`.
- Estrenos: `data/estrenos.json` (fechas de España). Sin clave TMDb se actualiza a mano: buscar cartelera en ecartelera / sensacine / elseptimoarte y reescribir la lista; luego `python tools/enriquecer.py --rapido` para pósters.
- Cines del usuario: Ocine Premium Los Fresnos y Yelmo Ocimax (Gijón), Oviedo (Yelmo Los Prados / Embajadores Foncalada / Cinesa Parque Principado).
- Recomendaciones: `tools/catalogo_recomendaciones.txt` (título ES | original | año | director | país | géneros | prestigio). Tras añadir líneas, `python tools/enriquecer.py --rapido`.
- Wikimedia limita peticiones: usar `tools/bulk.py` (SPARQL por lotes) antes que búsquedas una a una.
- Escala de notas: 0–10 con un decimal.
- Web pública de solo lectura: https://micinemateca.netlify.app (Netlify publica `app/` y ejecuta `tools/build_static.py`). Para actualizarla tras registrar pelis: commit + push de `data/db.json`.
