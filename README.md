<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-oscuro.png">
    <img src="docs/logo-claro.png" alt="Filora" width="340">
  </picture>
</p>

<p align="center"><b>Tu diario de cine privado.</b> Colección puntuada, estadísticas, gustos, recomendaciones y la cartelera de Gijón.</p>

<p align="center"><a href="https://filora-umber.vercel.app">filora-umber.vercel.app</a></p>

![Filora en ordenador (tema oscuro) y en móvil (tema claro)](docs/captura.jpg)

## Qué hace

- **Colección**: más de 600 películas y series con carátula, nota, géneros y taquilla (Box Office Mojo).
- **Añadir**: como en el Excel; escribes el título y la carátula y los datos se completan solos.
- **Tus cines**: cada persona elige los suyos entre los 634 cines de España (por ubicación o escribiendo su ciudad) y ve sus sesiones reales con enlace para comprar la entrada. Estrenos en España actualizados cada día.
- **Para ti**: recomendaciones con la nota que predice que le pondrías.
- **Estadísticas y gustos**: notas, décadas, géneros, directores…
- **Cuentas privadas**: cada persona crea su cuenta con usuario y contraseña y solo ella ve su colección. Sin cuenta solo se ven la cartelera, los estrenos y las recomendaciones.
- **App instalable** (PWA), funciona sin conexión, con tema claro y oscuro, en móvil, tableta y ordenador.
- **Excel sincronizado** (`Filora.xlsx`) en el PC.

## Uso

En el PC (Python 3.10+ y `pip install openpyxl`):

```bash
python server.py
```

O doble clic en `Iniciar.bat` → http://localhost:8765

La web pública está en Vercel, con los datos en Vercel Blob. Ninguna colección es pública: cada cuenta guarda la suya aparte y las contraseñas se guardan cifradas con scrypt. La cuenta del dueño (`OWNER_USER`, por defecto `mcifu`) solo se puede crear con el PIN (`EDIT_PIN`) y usa la misma colección que sincroniza el PC.

## Estructura

```
app/        interfaz web (HTML, CSS y JS sin dependencias) y PWA
api/        API para Vercel
server.py   servidor local + Excel + copias de seguridad
tools/      importación, enriquecimiento, cartelera, taquilla
data/       base de datos y estrenos
```
