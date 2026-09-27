# 🎬 Mi Cinemateca

Mi diario de cine personal: una app web local para registrar las películas que veo, puntuarlas y descubrir qué ver después, con un Excel profesional que se actualiza solo.

Nació de un Excel que llevo años rellenando a mano (más de 600 películas puntuadas del 0 al 10) y ahora es una app completa.

## Qué hace

- **Colección** con carátulas, filtros por género, década, país, saga y nota, y ficha de cada película con enlaces a FilmAffinity, IMDb, Rotten Tomatoes, SensaCine, Letterboxd y JustWatch.
- **Registrar una película** en segundos: buscas el título y se rellenan solos año, director, país, géneros, duración y póster (vía Wikidata, sin claves de API). Tú pones nota, fecha, dónde la viste y tu reseña.
- **Mis gustos**: perfil del espectador con radar de géneros, directores de cabecera, década dorada y conclusiones automáticas sobre cómo puntúas.
- **Estadísticas**: reparto de notas, décadas, géneros, países, sagas, fases del UCM, taquilla, duración frente a nota…
- **Para ti**: recomendaciones con la nota que predigo que les darías y el porqué. Validado con mis propias notas (dejando una fuera): error medio ±1,0 frente a ±1,3 de adivinar siempre la media.
- **Estrenos en España**: calendario con fechas de estreno en cines españoles, afinidad con cada película y enlaces a la cartelera de mis cines de Gijón y Oviedo.
- **Pendientes** y **series**.
- **Excel sincronizado** (`Mi Cinemateca.xlsx`): resumen con fórmulas y gráficos, películas, series, UCM con rentabilidad, pendientes y estrenos. Si lo edito a mano, puedo reimportar los cambios.

## Uso

Requisitos: Python 3.10+ y `openpyxl` (`pip install openpyxl`).

```bash
python server.py        # o doble clic en Iniciar.bat → http://localhost:8765
```

Desde la terminal:

```bash
python tools/pelis.py vista "Dune: Parte Dos" 8.5 --lugar "Yelmo Cines Ocimax Gijón" --resena "..."
python tools/pelis.py buscar nolan
python tools/pelis.py pendiente "Sirāt" --motivo "Recomendación"
python tools/pelis.py excel
```

## Versión web para compartir (Netlify)

La app completa necesita el servidor local, pero hay una **versión de solo lectura** que funciona en cualquier hosting estático: colección, fichas, estadísticas, gustos, recomendaciones y estrenos, sin botones de edición.

- `netlify.toml` le dice a Netlify que ejecute `python3 tools/build_static.py` (genera `app/data/*.json`) y publique la carpeta `app/`.
- Cada `git push` actualiza la web con lo último registrado.
- Para verla en local: `python tools/build_static.py` y abre `app/` con cualquier servidor estático añadiendo `?vitrina` a la URL.

## Estructura

```
server.py                 servidor local (API + web + regeneración del Excel + copias de seguridad)
app/                      interfaz web (HTML/CSS/JS sin dependencias)
data/db.json              base de datos (fuente de verdad)
data/estrenos.json        calendario de estrenos en España y mis cines
tools/importar_excel.py   importación inicial desde el Excel original (con correcciones)
tools/excel.py            exportar / reimportar el Excel profesional
tools/enriquecer.py       carátulas e IDs externos vía Wikidata (SPARQL por lotes)
tools/pelis.py            registro rápido por línea de comandos
tools/build_static.py     datos para la versión web de solo lectura (Netlify)
```

Opcional: con una clave gratuita de [TMDb](https://www.themoviedb.org/settings/api) (en Ajustes) el calendario de estrenos se actualiza automáticamente.

Datos de películas: [Wikidata](https://www.wikidata.org/) y [Wikipedia](https://www.wikipedia.org/).
