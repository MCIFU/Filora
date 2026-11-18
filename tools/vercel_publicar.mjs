// Paso «Ignored Build Step» de Vercel (vercel.json → ignoreCommand).
// Vercel solo publica los commits de main cuyo mensaje lleva [publicar]: el de cada mañana
// (.github/workflows/publicar.yml) o el que lances a mano. El resto se cancela sin gastar compilación.
// Salir con 0 = no publicar; con 1 = publicar.
const rama = process.env.VERCEL_GIT_COMMIT_REF || "";
const mensaje = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
const publicar = rama === "main" && mensaje.includes("[publicar]");
console.log(`Rama ${rama || "?"} · ${publicar ? "se publica" : "no se publica (falta [publicar] en el mensaje)"}`);
process.exit(publicar ? 1 : 0);
