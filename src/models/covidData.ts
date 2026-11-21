/**
 * Modelo tipado equivalente a lib/covid_data.dart del taller Flutter.
 * Convierte la respuesta JSON de disease.sh en un objeto seguro con campos tipados.
 */

export interface CovidData {
  country: string;
  cases: number;
  todayCases: number;
  deaths: number;
  todayDeaths: number;
  recovered: number;
  updated: Date;
  // Ampliación #1: bandera del país y código ISO desde countryInfo
  flagUrl: string | null;
  iso2: string | null;
  active: number;
  population: number;
}

export interface CountryOption {
  name: string;
  flagUrl: string | null;
  iso2: string | null;
}

export const BASE_COUNTRIES: string[] = [
  'Colombia',
  'Mexico',
  'Argentina',
  'Peru',
  'Chile',
  'Spain',
  'USA',
];

/**
 * Equivalente en TypeScript a `int toInt(dynamic v) => (v as num?)?.toInt() ?? 0;`
 * Protege contra valores null, undefined, strings inesperados o decimales en el JSON.
 */
export function toInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return 0;
}

export function covidDataFromJson(json: Record<string, unknown>): CovidData {
  const countryInfo =
    typeof json.countryInfo === 'object' && json.countryInfo !== null
      ? (json.countryInfo as Record<string, unknown>)
      : null;

  const updatedMs = toInt(json.updated);

  return {
    country: typeof json.country === 'string' ? json.country : 'Desconocido',
    cases: toInt(json.cases),
    todayCases: toInt(json.todayCases),
    deaths: toInt(json.deaths),
    todayDeaths: toInt(json.todayDeaths),
    recovered: toInt(json.recovered),
    updated: new Date(updatedMs),
    flagUrl:
      countryInfo && typeof countryInfo.flag === 'string'
        ? countryInfo.flag
        : null,
    iso2:
      countryInfo && typeof countryInfo.iso2 === 'string'
        ? countryInfo.iso2
        : null,
    active: toInt(json.active),
    population: toInt(json.population),
  };
}

/**
 * Función de formato manual del taller base (sin paquetes extra):
 * dd/MM/yyyy HH:mm
 */
export function formatDateBase(d: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/**
 * Ampliación #6: Formato localizado equivalente a intl (DateFormat y NumberFormat).
 */
export function formatDateIntl(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatNumber(value: number, useIntl: boolean): string {
  if (!useIntl) {
    return String(value);
  }
  return new Intl.NumberFormat('es-CO').format(value);
}
