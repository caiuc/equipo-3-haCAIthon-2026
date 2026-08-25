import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const CEAD_URL =
  "https://raw.githubusercontent.com/bastianolea/delincuencia_chile/main/datos/procesados/cead_delincuencia_chile.parquet";
const POBLACION_URL =
  "https://raw.githubusercontent.com/bastianolea/delincuencia_chile/main/app/censo_proyecciones_a%C3%B1o.csv";

const METROS_POR_CELDA = Number(process.env.SEGURIDAD_CELDA_METROS ?? 200);
const [DEFAULT_SOUTH, DEFAULT_WEST, DEFAULT_NORTH, DEFAULT_EAST] = [
  -33.62,
  -70.82,
  -33.32,
  -70.48,
];
const BBOX = {
  south: Number(process.env.SEGURIDAD_SUR ?? DEFAULT_SOUTH),
  west: Number(process.env.SEGURIDAD_OESTE ?? DEFAULT_WEST),
  north: Number(process.env.SEGURIDAD_NORTE ?? DEFAULT_NORTH),
  east: Number(process.env.SEGURIDAD_ESTE ?? DEFAULT_EAST),
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");
const TEMP_PREFIX = join(tmpdir(), "rutalibre-seguridad-");
const HIGHWAY_RANK = {
  motorway: 1,
  trunk: 0.95,
  primary: 0.9,
  secondary: 0.8,
  tertiary: 0.7,
  unclassified: 0.55,
  residential: 0.5,
  living_street: 0.45,
  service: 0.3,
  cycleway: 0.25,
  footway: 0.2,
  path: 0.1,
};

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function redondear(numero, decimales = 4) {
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
}

function limitar(numero, minimo = 0, maximo = 1) {
  return Math.max(minimo, Math.min(maximo, numero));
}

function validarConfiguracion() {
  if (!Number.isFinite(METROS_POR_CELDA) || METROS_POR_CELDA <= 0) {
    throw new Error("SEGURIDAD_CELDA_METROS debe ser un numero positivo");
  }
  if (
    !Number.isFinite(BBOX.south) ||
    !Number.isFinite(BBOX.west) ||
    !Number.isFinite(BBOX.north) ||
    !Number.isFinite(BBOX.east) ||
    BBOX.south >= BBOX.north ||
    BBOX.west >= BBOX.east
  ) {
    throw new Error("El bounding box de Santiago no es valido");
  }
}

async function fetchConReintento(url, opciones = {}, etiqueta = url, alternativas = []) {
  let ultimoError;
  for (const urlActual of [url, ...alternativas]) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 360_000);
    try {
      const respuesta = await fetch(urlActual, {
        ...opciones,
        signal: controlador.signal,
        headers: {
          "User-Agent": "RutaLibre/1.0 (preparacion de datos de seguridad)",
          ...(opciones.headers ?? {}),
        },
      });
      if (!respuesta.ok) {
        throw new Error(`${respuesta.status} ${respuesta.statusText}`);
      }
      clearTimeout(temporizador);
      return respuesta;
    } catch (error) {
      clearTimeout(temporizador);
      ultimoError = error;
      console.warn(`No se pudo descargar ${etiqueta} desde ${urlActual}: ${error.message}`);
    }
  }
  throw new Error(`No se pudo descargar ${etiqueta}: ${ultimoError.message}`);
}

async function consultarOverpass(query, etiqueta) {
  const respuesta = await fetchConReintento(
    OVERPASS_URLS[0],
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: `data=${encodeURIComponent(query)}`,
    },
    etiqueta,
    OVERPASS_URLS.slice(1),
  );
  const datos = await respuesta.json();
  if (!Array.isArray(datos.elements)) {
    throw new Error(`La respuesta de Overpass para ${etiqueta} no contiene elements`);
  }
  return datos.elements;
}

function bboxOverpass() {
  return `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;
}

function consultaContexto() {
  const bbox = bboxOverpass();
  return `[out:json][timeout:300];
(
  way["highway"](${bbox});
  way["landuse"~"commercial|retail"](${bbox});
  way["leisure"="park"](${bbox});
  node["shop"](${bbox});
  node["amenity"~"restaurant|cafe|bar|pharmacy|bank|fuel"](${bbox});
);
  out body geom qt;`;
}

function consultaComunas() {
  return `[out:json][timeout:300];
relation["boundary"="administrative"]["admin_level"="8"](${bboxOverpass()});
out body geom qt;`;
}

async function descargarArchivo(url, nombre) {
  const respuesta = await fetchConReintento(url, {}, nombre);
  const archivo = join(await mkdtemp(TEMP_PREFIX), nombre);
  await writeFile(archivo, Buffer.from(await respuesta.arrayBuffer()));
  return archivo;
}

function encontrarCampo(campos, candidatos) {
  const normalizados = new Map(campos.map((campo) => [normalizar(campo), campo]));
  for (const candidato of candidatos) {
    const campo = normalizados.get(normalizar(candidato));
    if (campo) return campo;
  }
  return null;
}

function parsearFecha(valor) {
  if (valor instanceof Date) return valor;
  if (typeof valor === "number") {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
  const fecha = new Date(String(valor));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

async function leerCead(archivo) {
  const archivoParquet = await asyncBufferFromFile(archivo);
  const filas = await parquetReadObjects({ file: archivoParquet });
  const campos = filas.length ? Object.keys(filas[0]) : [];
  const campoComuna = encontrarCampo(campos, ["comuna"]);
  const campoCodigo = encontrarCampo(campos, ["cut_comuna"]);
  const campoRegion = encontrarCampo(campos, ["region"]);
  const campoFecha = encontrarCampo(campos, ["fecha"]);
  const campoCasos = encontrarCampo(campos, ["delitos", "delito_n", "casos"]);

  if (!campoComuna || !campoCodigo || !campoFecha || !campoCasos) {
    throw new Error(`Columnas CEAD inesperadas. Encontradas: ${campos.join(", ")}`);
  }

  const acumulados = new Map();
  let anioMinimo = Infinity;
  let anioMaximo = -Infinity;
  let filasProcesadas = 0;
  for (const fila of filas) {
    const fecha = parsearFecha(fila[campoFecha]);
    const anio = fecha?.getUTCFullYear();
    const casos = Number(fila[campoCasos]);
    if (!Number.isFinite(anio) || !Number.isFinite(casos) || anio < 2018) continue;

    const codigo = String(fila[campoCodigo]);
    const clave = codigo || normalizar(fila[campoComuna]);
    const actual = acumulados.get(clave) ?? {
      codigo,
      comuna: String(fila[campoComuna] ?? ""),
      region: String(fila[campoRegion] ?? ""),
      casos: 0,
    };
    actual.casos += casos;
    acumulados.set(clave, actual);
    anioMinimo = Math.min(anioMinimo, anio);
    anioMaximo = Math.max(anioMaximo, anio);
    filasProcesadas += 1;
  }
  return { acumulados, anioMinimo, anioMaximo, filas: filasProcesadas };
}

function parsearCsv(texto) {
  const lineas = texto.trim().split(/\r?\n/);
  const cabeceras = lineas.shift().split(",").map((campo) => campo.trim());
  return lineas.map((linea) => {
    const valores = [];
    let actual = "";
    let entreComillas = false;
    for (const caracter of linea) {
      if (caracter === '"') entreComillas = !entreComillas;
      else if (caracter === "," && !entreComillas) {
        valores.push(actual);
        actual = "";
      } else actual += caracter;
    }
    valores.push(actual);
    return Object.fromEntries(cabeceras.map((cabecera, indice) => [cabecera, valores[indice] ?? ""]));
  });
}

async function leerPoblacion() {
  const respuesta = await fetchConReintento(POBLACION_URL, {}, "proyecciones de poblacion");
  const filas = parsearCsv(await respuesta.text());
  const poblacion = new Map();
  for (const fila of filas) {
    const codigo = String(fila.cut_comuna ?? "");
    const anio = Number(fila.año);
    const valor = Number(fila["población"]);
    if (codigo && Number.isFinite(anio) && Number.isFinite(valor)) {
      poblacion.set(`${codigo}:${anio}`, valor);
    }
  }
  return poblacion;
}

function crearSeguridadComunas(cead, poblacion) {
  const comunas = [...cead.acumulados.values()].filter(
    (comuna) => normalizar(comuna.region) === normalizar("Metropolitana de Santiago"),
  );
  const tasas = comunas.map((comuna) => {
    const poblacionActual = poblacion.get(`${comuna.codigo}:${cead.anioMaximo}`) ?? 0;
    return poblacionActual > 0 ? (comuna.casos / poblacionActual) * 1000 : 0;
  });
  const tasaMinima = Math.min(...tasas);
  const tasaMaxima = Math.max(...tasas);
  const diferencia = tasaMaxima - tasaMinima || 1;

  return comunas
    .map((comuna) => {
      const poblacionActual = poblacion.get(`${comuna.codigo}:${cead.anioMaximo}`) ?? null;
      const tasa = poblacionActual ? (comuna.casos / poblacionActual) * 1000 : null;
      const scoreBase = tasa == null ? null : 1 - limitar((tasa - tasaMinima) / diferencia);
      return {
        cutComuna: Number(comuna.codigo),
        comuna: comuna.comuna,
        region: comuna.region,
        periodoDesde: cead.anioMinimo,
        periodoHasta: cead.anioMaximo,
        casosPeriodo: Math.round(comuna.casos),
        poblacion: poblacionActual,
        tasaDelitos1000: tasa == null ? null : redondear(tasa, 2),
        scoreBase: scoreBase == null ? null : redondear(scoreBase, 3),
        scoreCrimen: scoreBase == null ? null : redondear(scoreBase * 20, 2),
      };
    })
    .sort((a, b) => a.comuna.localeCompare(b.comuna, "es"));
}

function obtenerCoordenadas(elemento) {
  if (elemento.type === "node" && Number.isFinite(elemento.lat) && Number.isFinite(elemento.lon)) {
    return [[elemento.lon, elemento.lat]];
  }
  return (elemento.geometry ?? [])
    .filter((punto) => Number.isFinite(punto.lat) && Number.isFinite(punto.lon))
    .map((punto) => [punto.lon, punto.lat]);
}

function crearIndicesGrid() {
  const latitudPorMetro = 1 / 111320;
  const longitudPorMetro = 1 / (111320 * Math.cos((Math.abs((BBOX.south + BBOX.north) / 2) * Math.PI) / 180));
  return {
    latitudPorMetro,
    longitudPorMetro,
    alto: METROS_POR_CELDA * latitudPorMetro,
    ancho: METROS_POR_CELDA * longitudPorMetro,
  };
}

function indiceCelda(lon, lat, indices) {
  const x = Math.floor((lon - BBOX.west) / indices.ancho);
  const y = Math.floor((lat - BBOX.south) / indices.alto);
  if (x < 0 || y < 0 || lon > BBOX.east || lat > BBOX.north) return null;
  return `${x}:${y}`;
}

function actualizarCelda(celdas, clave) {
  if (!celdas.has(clave)) celdas.set(clave, { calles: 0, callesIluminadas: 0, rangoCalle: 0, comercio: 0, locales: 0, parques: 0 });
  return celdas.get(clave);
}

function celdasDeElemento(elemento, indices) {
  return new Set(
    obtenerCoordenadas(elemento)
      .map(([lon, lat]) => indiceCelda(lon, lat, indices))
      .filter(Boolean),
  );
}

function construirGrid(elementos) {
  const indices = crearIndicesGrid();
  const celdas = new Map();
  for (const elemento of elementos) {
    const tags = elemento.tags ?? {};
    const claves = celdasDeElemento(elemento, indices);
    if (claves.size === 0) continue;
    for (const clave of claves) {
      const celda = actualizarCelda(celdas, clave);
      if (elemento.type === "node") {
        if (tags.shop || tags.amenity) celda.locales += 1;
        continue;
      }
      if (tags.highway) {
        celda.calles += 1;
        if (tags.lit === "yes" || tags.lit === "24/7") celda.callesIluminadas += 1;
        celda.rangoCalle = Math.max(celda.rangoCalle, HIGHWAY_RANK[tags.highway] ?? 0.4);
      }
      if (["commercial", "retail"].includes(tags.landuse)) celda.comercio += 1;
      if (tags.leisure === "park") celda.parques += 1;
    }
  }

  const celdasLista = [...celdas.entries()].map(([id, celda]) => {
    const [x, y] = id.split(":").map(Number);
    const iluminacion = celda.calles ? celda.callesIluminadas / celda.calles : 0;
    const densidadComercial = limitar((celda.comercio + celda.locales * 0.25) / 12);
    const scoreContexto = limitar(
      densidadComercial * 0.55 + iluminacion * 0.3 + celda.rangoCalle * 0.15,
    );
    const centroLon = BBOX.west + (x + 0.5) * indices.ancho;
    const centroLat = BBOX.south + (y + 0.5) * indices.alto;
    return {
      id,
      centro: [redondear(centroLon, 6), redondear(centroLat, 6)],
      densidadComercial: redondear(densidadComercial, 3),
      iluminacion: redondear(iluminacion, 3),
      tipoCalle: redondear(celda.rangoCalle, 3),
      scoreContexto: redondear(scoreContexto * 45, 2),
      calles: celda.calles,
      callesIluminadas: celda.callesIluminadas,
      locales: celda.locales,
      parques: celda.parques,
    };
  });
  return celdasLista.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function puntosIguales(a, b) {
  return Math.abs(a[0] - b[0]) < 0.000001 && Math.abs(a[1] - b[1]) < 0.000001;
}

function unirAnillo(miembros) {
  const pendientes = miembros
    .map((miembro) => obtenerCoordenadas(miembro))
    .filter((coordenadas) => coordenadas.length >= 2);
  const anillos = [];
  while (pendientes.length) {
    let anillo = pendientes.shift();
    let unido = true;
    while (unido && !puntosIguales(anillo[0], anillo.at(-1))) {
      unido = false;
      const final = anillo.at(-1);
      const indice = pendientes.findIndex((parte) => puntosIguales(parte[0], final) || puntosIguales(parte.at(-1), final));
      if (indice === -1) break;
      let parte = pendientes.splice(indice, 1)[0];
      if (puntosIguales(parte.at(-1), final)) parte = parte.reverse();
      anillo = [...anillo, ...parte.slice(1)];
      unido = true;
    }
    if (anillo.length >= 4) {
      if (!puntosIguales(anillo[0], anillo.at(-1))) anillo.push(anillo[0]);
      anillos.push(anillo);
    }
  }
  return anillos;
}

function puntoEnAnillo(punto, anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    const intersecta = yi > punto[1] !== yj > punto[1] && punto[0] < ((xj - xi) * (punto[1] - yi)) / (yj - yi) + xi;
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

function relacionAGeoJson(relacion, datosComunas) {
  const tags = relacion.tags ?? {};
  const miembros = (relacion.members ?? []).filter((miembro) => miembro.type === "way" && miembro.geometry);
  const exteriores = unirAnillo(miembros.filter((miembro) => miembro.role !== "inner"));
  const interiores = unirAnillo(miembros.filter((miembro) => miembro.role === "inner"));
  if (!exteriores.length) return null;
  const poligonos = exteriores.map((exterior) => [
    exterior,
    ...interiores.filter((interior) => puntoEnAnillo(interior[0], exterior)),
  ]);
  const geometria = poligonos.length === 1 ? { type: "Polygon", coordinates: poligonos[0] } : { type: "MultiPolygon", coordinates: poligonos };
  const comuna = datosComunas.find((dato) => normalizar(dato.comuna) === normalizar(tags.name));
  return {
    type: "Feature",
    properties: {
      comuna: tags.name ?? null,
      cutComuna: comuna?.cutComuna ?? null,
      fuente: "OpenStreetMap Overpass",
    },
    geometry: geometria,
  };
}

function construirComunasGeoJson(relaciones, datosComunas) {
  const nombres = new Set(datosComunas.map((dato) => normalizar(dato.comuna)));
  const features = relaciones
    .filter((relacion) => nombres.has(normalizar(relacion.tags?.name)))
    .map((relacion) => relacionAGeoJson(relacion, datosComunas))
    .filter(Boolean)
    .sort((a, b) => a.properties.comuna.localeCompare(b.properties.comuna, "es"));
  if (features.length === 0) throw new Error("Overpass no devolvio geometrias comunales de Santiago");
  return { type: "FeatureCollection", features };
}

async function escribirJson(nombre, contenido) {
  const destino = join(DATA_DIR, nombre);
  const temporal = `${destino}.tmp`;
  await writeFile(temporal, JSON.stringify(contenido));
  await rename(temporal, destino);
}

async function principal() {
  validarConfiguracion();
  await mkdir(DATA_DIR, { recursive: true });
  console.log("Descargando datos CEAD y poblacion...");
  const [archivoCead, poblacion] = await Promise.all([
    descargarArchivo(CEAD_URL, "cead.parquet"),
    leerPoblacion(),
  ]);
  archivoTemporal = archivoCead;
  const cead = await leerCead(archivoCead);
  const seguridadComunas = crearSeguridadComunas(cead, poblacion);
  if (!seguridadComunas.length) throw new Error("No se encontraron comunas de la Region Metropolitana en CEAD");

  console.log("Descargando calles, locales y limites comunales desde Overpass...");
  const elementosContexto = await consultarOverpass(consultaContexto(), "datos OSM de contexto");
  const relacionesComunas = await consultarOverpass(consultaComunas(), "limites comunales");
  const grid = construirGrid(elementosContexto);
  const comunasGeoJson = construirComunasGeoJson(relacionesComunas, seguridadComunas);

  await Promise.all([
    escribirJson("grid_seguridad.json", {
      version: 1,
      fuente: "OpenStreetMap Overpass",
      generado: new Date().toISOString(),
      celdaMetros: METROS_POR_CELDA,
      bbox: [BBOX.west, BBOX.south, BBOX.east, BBOX.north],
      celdas: grid,
    }),
    escribirJson("seguridad_comunas.json", {
      version: 1,
      fuente: "CEAD via delincuencia_chile",
      generado: new Date().toISOString(),
      periodoDesde: cead.anioMinimo,
      periodoHasta: cead.anioMaximo,
      comunas: seguridadComunas,
    }),
    escribirJson("comunas_santiago.geojson", comunasGeoJson),
  ]);

  console.log(`Listo: ${grid.length} celdas, ${comunasGeoJson.features.length} comunas y ${cead.filas} filas CEAD procesadas.`);
}

let archivoTemporal;
try {
  await principal();
} catch (error) {
  console.error(`Error preparando datos de seguridad: ${error.stack ?? error.message ?? error}`);
  process.exitCode = 1;
} finally {
  if (archivoTemporal) await rm(archivoTemporal, { force: true });
}
