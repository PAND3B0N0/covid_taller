import {
  CountryOption,
  CovidData,
  covidDataFromJson,
} from '../models/covidData';

/**
 * Servicio HTTP equivalente a lib/covid_api.dart del taller Flutter.
 * Consulta la API pública disease.sh con timeout de 10 segundos y manejo de errores.
 */

export interface FetchCountryResult {
  data: CovidData;
  rawJson: Record<string, unknown>;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  fetchedAt: Date;
}

const REQUEST_TIMEOUT_MS = 10_000;

export async function fetchCountry(
  country: string,
  options?: { simulateOffline?: boolean },
): Promise<FetchCountryResult> {
  const endpoint = `https://disease.sh/v3/covid-19/countries/${encodeURIComponent(country)}`;
  const startedAt = performance.now();

  if (options?.simulateOffline) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    throw new Error(
      'SocketException: Sin conexión a internet (Modo avión simulado)',
    );
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status !== 200) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const rawJson = (await response.json()) as Record<string, unknown>;
    const durationMs = Math.round(performance.now() - startedAt);

    return {
      data: covidDataFromJson(rawJson),
      rawJson,
      endpoint,
      statusCode: response.status,
      durationMs,
      fetchedAt: new Date(),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('TimeoutException: Tiempo de espera agotado (10s)');
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Ampliación #2: Cargar dinámicamente la lista de países desde disease.sh.
 */
export async function fetchAllCountries(options?: {
  simulateOffline?: boolean;
}): Promise<CountryOption[]> {
  if (options?.simulateOffline) {
    throw new Error(
      'SocketException: Sin conexión a internet (Modo avión simulado)',
    );
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch('https://disease.sh/v3/covid-19/countries', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status !== 200) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const items = (await response.json()) as Array<Record<string, unknown>>;
    return items
      .filter((item) => typeof item.country === 'string')
      .map((item) => {
        const info =
          typeof item.countryInfo === 'object' && item.countryInfo !== null
            ? (item.countryInfo as Record<string, unknown>)
            : null;
        return {
          name: item.country as string,
          flagUrl: info && typeof info.flag === 'string' ? info.flag : null,
          iso2: info && typeof info.iso2 === 'string' ? info.iso2 : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('TimeoutException: Tiempo de espera agotado (10s)');
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
