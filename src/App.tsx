import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Clock,
  Globe,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react';
import {
  BASE_COUNTRIES,
  CountryOption,
  formatDateBase,
  formatDateIntl,
  formatNumber,
} from './models/covidData';
import {
  fetchAllCountries,
  fetchCountry,
  FetchCountryResult,
} from './services/covidApi';
import {
  LocalNotificationPayload,
  NotificationService,
  PermissionStatus,
} from './services/notificationService';
import { StatCard } from './components/StatCard';
import { NotificationBanner } from './components/NotificationBanner';
import { ApiInspectorView } from './components/ApiInspectorView';
import { FlutterCodeView } from './components/FlutterCodeView';

type ActiveTab = 'app' | 'inspector' | 'flutter';
type CountryListMode = 'base' | 'all';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('app');

  // Estado de países (Base del taller vs Ampliación #2 dinámica)
  const [countryMode, setCountryMode] = useState<CountryListMode>('base');
  const [allCountries, setAllCountries] = useState<CountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('Colombia');

  // Estado de la consulta principal (equivalente a FutureBuilder<CovidData>)
  const [result, setResult] = useState<FetchCountryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [flagFailed, setFlagFailed] = useState<boolean>(false);

  // Controles de prueba del taller y ampliaciones
  const [airplaneMode, setAirplaneMode] = useState<boolean>(false);
  const [useIntlFormat, setUseIntlFormat] = useState<boolean>(true);
  const [useBigText, setUseBigText] = useState<boolean>(true);

  // Ampliación #4: Consulta periódica tipo WorkManager
  const [periodicEnabled, setPeriodicEnabled] = useState<boolean>(false);
  const [lastPeriodicCheck, setLastPeriodicCheck] = useState<Date | null>(null);
  const [periodicNote, setPeriodicNote] = useState<string>(
    'Inactiva. Actívala para comprobar cambios en todayCases cada 15 s.',
  );
  const lastObservedTodayCasesRef = useRef<number | null>(null);

  // Notificaciones locales (id fijo 0 reemplaza la anterior)
  const [permission, setPermission] = useState<PermissionStatus>(() =>
    NotificationService.getPermissionStatus(),
  );
  const [activeBanner, setActiveBanner] =
    useState<LocalNotificationPayload | null>(null);
  const [lastNotification, setLastNotification] =
    useState<LocalNotificationPayload | null>(null);
  const [notificationCount, setNotificationCount] = useState<number>(0);

  const loadCountryData = useCallback(
    async (country: string, offline: boolean, silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      setFlagFailed(false);

      try {
        const res = await fetchCountry(country, { simulateOffline: offline });
        setResult(res);
        setError(null);
        return res;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error desconocido de red';
        setError(message);
        if (!silent) {
          setResult(null);
        }
        return null;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // Carga inicial y al cambiar país seleccionado
  useEffect(() => {
    lastObservedTodayCasesRef.current = null;
    void loadCountryData(selectedCountry, airplaneMode);
  }, [selectedCountry, loadCountryData, airplaneMode]);

  // Carga dinámica de todos los países al activar Ampliación #2
  const handleSwitchCountryMode = async (mode: CountryListMode) => {
    setCountryMode(mode);
    setCountryQuery('');
    if (mode === 'base') {
      if (!BASE_COUNTRIES.includes(selectedCountry)) {
        setSelectedCountry('Colombia');
      }
      return;
    }

    if (allCountries.length > 0) return;

    setLoadingCountries(true);
    setCountriesError(null);
    try {
      const list = await fetchAllCountries({ simulateOffline: airplaneMode });
      setAllCountries(list);
    } catch (err) {
      setCountriesError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista completa de países',
      );
    } finally {
      setLoadingCountries(false);
    }
  };

  const filteredCountries = useMemo(() => {
    if (countryMode === 'base') {
      return BASE_COUNTRIES.map((name) => ({ name, flagUrl: null, iso2: null }));
    }
    const q = countryQuery.trim().toLowerCase();
    if (!q) return allCountries;
    return allCountries.filter((c) => c.name.toLowerCase().includes(q));
  }, [countryMode, allCountries, countryQuery]);

  const handleRequestPermission = async () => {
    const next = await NotificationService.requestPermission();
    setPermission(next);
  };

  const handleSendNotification = useCallback(
    async (
      source: 'manual' | 'workmanager' = 'manual',
      overrideTodayCases?: number,
    ) => {
      if (!result) return;
      const dataToNotify =
        typeof overrideTodayCases === 'number'
          ? { ...result.data, todayCases: overrideTodayCases }
          : result.data;

      const payload = await NotificationService.show(dataToNotify, {
        bigTextEnabled: useBigText,
        useIntl: useIntlFormat,
        triggerSource: source,
      });

      setActiveBanner(payload);
      setLastNotification(payload);
      setNotificationCount((c) => c + 1);
    },
    [result, useBigText, useIntlFormat],
  );

  // Sincroniza referencia inicial de todayCases para WorkManager
  useEffect(() => {
    if (result && lastObservedTodayCasesRef.current === null) {
      lastObservedTodayCasesRef.current = result.data.todayCases;
    }
  }, [result]);

  // Ampliación #4: Intervalo periódico de comprobación (notifica solo si cambia todayCases)
  useEffect(() => {
    if (!periodicEnabled) return;

    const runCheck = async () => {
      const checkTime = new Date();
      setLastPeriodicCheck(checkTime);
      const latest = await loadCountryData(selectedCountry, airplaneMode, true);
      if (!latest) {
        setPeriodicNote(
          `Error en verificación (${formatDateBase(checkTime).split(' ')[1]}): sin conexión.`,
        );
        return;
      }

      const prevCases = lastObservedTodayCasesRef.current;
      const nextCases = latest.data.todayCases;
      lastObservedTodayCasesRef.current = nextCases;

      if (prevCases !== null && nextCases !== prevCases) {
        setPeriodicNote(
          `Cambio detectado en todayCases (${prevCases} -> ${nextCases}). Notificación enviada.`,
        );
        await handleSendNotification('workmanager');
      } else {
        setPeriodicNote(
          `Sin cambios en todayCases (${nextCases}). No se envió notificación.`,
        );
      }
    };

    const intervalId = window.setInterval(() => {
      void runCheck();
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [
    periodicEnabled,
    selectedCountry,
    airplaneMode,
    loadCountryData,
    handleSendNotification,
  ]);

  const handleSimulateTodayCasesDelta = async () => {
    if (!result) return;
    const simulatedValue = result.data.todayCases + 14;
    lastObservedTodayCasesRef.current = simulatedValue;
    setResult((prev) =>
      prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              todayCases: simulatedValue,
              cases: prev.data.cases + 14,
              updated: new Date(),
            },
          }
        : prev,
    );
    setLastPeriodicCheck(new Date());
    setPeriodicNote(
      `Cambio simulado en todayCases (+14 -> ${formatNumber(simulatedValue, useIntlFormat)}). Notificación enviada automáticamente.`,
    );
    await handleSendNotification('workmanager', simulatedValue);
  };

  const permissionLabel: Record<PermissionStatus, string> = {
    granted: 'Concedido (notificaciones del sistema activas)',
    default: 'Pendiente de solicitud',
    denied: 'Denegado en el navegador (se usa la bandeja local)',
    unsupported: 'API nativa no disponible (se usa la bandeja local)',
  };

  const data = result?.data ?? null;
  const formattedUpdated = data
    ? useIntlFormat
      ? formatDateIntl(data.updated)
      : formatDateBase(data.updated)
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: exactamente 3 zonas separadas por gap-8 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zona 1: Wordmark de una línea */}
          <a
            href="#aplicacion"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('app');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Datos COVID-19
          </a>

          {/* Zona 2: Enlaces de navegación de texto limpio */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium"
            aria-label="Navegación principal"
          >
            {(
              [
                { id: 'app', label: 'Aplicación' },
                { id: 'inspector', label: 'Inspector API' },
                { id: 'flutter', label: 'Código Flutter' },
              ] as const
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700 ${
                    active
                      ? 'border-teal-700 text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zona 3: 1 acción principal */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => void handleSendNotification('manual')}
              disabled={!data || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 active:scale-[0.98] transition-all disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              Enviar notificación
            </button>
          </div>
        </div>

        {/* Navegación móvil compacta */}
        <nav
          className="md:hidden border-t border-slate-100 px-4 flex items-center gap-5 overflow-x-auto"
          aria-label="Navegación móvil"
        >
          {(
            [
              { id: 'app', label: 'Aplicación' },
              { id: 'inspector', label: 'Inspector API' },
              { id: 'flutter', label: 'Código Flutter' },
            ] as const
          ).map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-teal-700 text-slate-900'
                    : 'border-transparent text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Notificación local flotante (reemplaza siempre id 0) */}
      <NotificationBanner
        notification={activeBanner}
        onDismiss={() => setActiveBanner(null)}
      />

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'app' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Columna principal (8/12): Consulta y visualización de datos COVID-19 */}
            <div className="lg:col-span-8 space-y-6">
              {/* Selector de país y modo de lista */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">
                      Consulta por país
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Endpoint activo:{' '}
                      <code className="font-mono text-slate-700">
                        disease.sh/v3/covid-19/countries/{selectedCountry}
                      </code>
                    </p>
                  </div>

                  {/* Segmented control interactivo: Base (7) vs Todos los países (Ampliación #2) */}
                  <div
                    className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto shrink-0"
                    role="tablist"
                    aria-label="Fuente de la lista de países"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={countryMode === 'base'}
                      onClick={() => void handleSwitchCountryMode('base')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        countryMode === 'base'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Lista base (7)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={countryMode === 'all'}
                      onClick={() => void handleSwitchCountryMode('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        countryMode === 'all'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos desde API
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {countryMode === 'all' ? (
                    <div className="relative flex-1">
                      <Search
                        className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={countryQuery}
                        onChange={(e) => setCountryQuery(e.target.value)}
                        placeholder="Filtrar país en inglés (ej. Brazil, Japan, France)..."
                        aria-label="Filtrar países"
                        className="w-full h-11 pl-10 pr-3.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>
                  ) : null}

                  <div className="flex-1 flex items-center gap-3">
                    <label htmlFor="country-select" className="sr-only">
                      Seleccionar país
                    </label>
                    <select
                      id="country-select"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      disabled={loadingCountries}
                      className="w-full h-11 px-3.5 text-sm font-medium bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                    >
                      {loadingCountries ? (
                        <option value={selectedCountry}>
                          Cargando países desde disease.sh...
                        </option>
                      ) : filteredCountries.length === 0 ? (
                        <option value={selectedCountry}>
                          Sin coincidencias para "{countryQuery}"
                        </option>
                      ) : (
                        filteredCountries.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        void loadCountryData(selectedCountry, airplaneMode)
                      }
                      disabled={loading}
                      className="h-11 px-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      Actualizar
                    </button>
                  </div>
                </div>

                {countriesError ? (
                  <p className="text-xs text-red-700">
                    No se pudo cargar la lista dinámica: {countriesError}
                  </p>
                ) : null}
              </section>

              {/* Estado de carga (equivalente a CircularProgressIndicator en FutureBuilder) */}
              {loading ? (
                <section
                  aria-busy="true"
                  aria-label="Cargando datos del país"
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-11 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-28 rounded-xl border border-slate-200 bg-slate-50/70 animate-pulse"
                      />
                    ))}
                  </div>
                </section>
              ) : error ? (
                /* Estado de error (equivalente a snapshot.hasError + Reintentar) */
                <section
                  role="alert"
                  className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto">
                    {airplaneMode ? (
                      <WifiOff className="w-6 h-6" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-6 h-6" aria-hidden="true" />
                    )}
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h2 className="text-lg font-bold text-slate-900">
                      No se pudo consultar: {error}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {airplaneMode
                        ? 'El modo avión simulado está activo. Desactívalo en el panel derecho o pulsa Reintentar para comprobar el manejo de excepciones.'
                        : 'Verifica tu conexión a internet o que el nombre del país exista en disease.sh.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        void loadCountryData(selectedCountry, airplaneMode)
                      }
                      className="px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
                    >
                      Reintentar
                    </button>
                    {airplaneMode ? (
                      <button
                        type="button"
                        onClick={() => setAirplaneMode(false)}
                        className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        Desactivar modo avión
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : data ? (
                /* Estado con datos (equivalente al Column de CovidData) */
                <section className="space-y-6">
                  {/* Cabecera del país con bandera (Ampliación #1) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                      <div className="flex items-center gap-4 min-w-0">
                        {data.flagUrl && !flagFailed ? (
                          <img
                            src={data.flagUrl}
                            alt={`Bandera de ${data.country}`}
                            referrerPolicy="no-referrer"
                            onError={() => setFlagFailed(true)}
                            className="w-16 h-11 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-11 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            {data.iso2 ? (
                              <span className="font-mono text-xs font-semibold">
                                {data.iso2}
                              </span>
                            ) : (
                              <Globe className="w-5 h-5" aria-hidden="true" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
                            {data.country}
                          </h2>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                            <span>Actualizado: {formattedUpdated}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Población:{' '}
                              <span className="font-mono tabular-nums text-slate-700">
                                {formatNumber(data.population, useIntlFormat)}
                              </span>
                            </span>
                            {result ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  HTTP {result.statusCode} ({result.durationMs}{' '}
                                  ms)
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Grid de tarjetas reutilizables (Ampliación #5) */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <StatCard
                        label="Casos acumulados"
                        value={formatNumber(data.cases, useIntlFormat)}
                        fieldKey="cases"
                        secondaryText="Total histórico reportado"
                      />
                      <StatCard
                        label="Casos del día"
                        value={formatNumber(data.todayCases, useIntlFormat)}
                        fieldKey="todayCases"
                        tone={data.todayCases > 0 ? 'caution' : 'default'}
                        secondaryText="Variación diaria registrada"
                      />
                      <StatCard
                        label="Muertes acumuladas"
                        value={formatNumber(data.deaths, useIntlFormat)}
                        fieldKey="deaths"
                        tone="danger"
                        secondaryText="Total histórico de fallecimientos"
                      />
                      <StatCard
                        label="Muertes del día"
                        value={formatNumber(data.todayDeaths, useIntlFormat)}
                        fieldKey="todayDeaths"
                        secondaryText="Fallecimientos registrados hoy"
                      />
                      <StatCard
                        label="Recuperados"
                        value={formatNumber(data.recovered, useIntlFormat)}
                        fieldKey="recovered"
                        tone="positive"
                        secondaryText="Personas recuperadas acumuladas"
                      />
                      <StatCard
                        label="Casos activos"
                        value={formatNumber(data.active, useIntlFormat)}
                        fieldKey="active"
                        secondaryText="Estimación actual en disease.sh"
                      />
                    </div>

                    {/* Acción principal inferior (equivalente a FilledButton en main.dart) */}
                    <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                        Nota sobre los datos: los registros de COVID-19 ya no se
                        actualizan como antes y el campo{' '}
                        <code className="font-mono text-slate-700">updated</code>{' '}
                        refleja la renovación de caché del servidor.
                      </p>

                      <button
                        type="button"
                        onClick={() => void handleSendNotification('manual')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-xl hover:bg-teal-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                      >
                        <Bell className="w-4 h-4" aria-hidden="true" />
                        Enviar notificación
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>

            {/* Columna derecha (4/12): Bandeja de notificación local y pruebas del taller */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Vista previa de la notificación local (ID 0) */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Bandeja de notificación (id 0)
                  </h2>
                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {notificationCount} envíos
                  </span>
                </div>

                {lastNotification ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono">
                        {lastNotification.channelId} · id 0
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatDateBase(lastNotification.sentAt).split(' ')[1]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {lastNotification.title}
                    </p>
                    {lastNotification.bigText ? (
                      <pre className="text-xs text-slate-700 font-sans whitespace-pre-line leading-relaxed">
                        {lastNotification.bigText}
                      </pre>
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {lastNotification.body}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                      Origen:{' '}
                      {lastNotification.triggerSource === 'workmanager'
                        ? 'Consulta periódica (cambio en todayCases)'
                        : 'Botón Enviar notificación'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
                    Pulsa{' '}
                    <strong className="font-semibold text-slate-900">
                      Enviar notificación
                    </strong>{' '}
                    para generar el resumen local de {selectedCountry}. Al usar
                    el id fijo 0, cada nueva notificación reemplaza a la
                    anterior.
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-xs text-slate-500">
                    Permiso de notificaciones del navegador:{' '}
                    <span className="font-medium text-slate-800">
                      {permissionLabel[permission]}
                    </span>
                  </div>
                  {permission === 'default' ? (
                    <button
                      type="button"
                      onClick={() => void handleRequestPermission()}
                      className="w-full py-2 px-3 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      Solicitar permiso POST_NOTIFICATIONS
                    </button>
                  ) : null}
                </div>
              </section>

              {/* Controles interactivos de pruebas (Sección 9) y ampliaciones (Sección 10) */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pruebas y ampliaciones
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verifica los 4 casos de prueba y las ampliaciones del taller.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* Prueba #4: Modo avión */}
                  <label className="py-3 first:pt-0 flex items-start justify-between gap-4 cursor-pointer">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        Modo avión (simular error)
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Prueba #4: fuerza fallo de red y habilita Reintentar.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={airplaneMode}
                      onChange={(e) => setAirplaneMode(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-teal-700 rounded cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Ampliación #3: BigTextStyleInformation */}
                  <label className="py-3 flex items-start justify-between gap-4 cursor-pointer">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        Notificación expandida (BigText)
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ampliación #3: incluye las 6 métricas en el cuerpo.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={useBigText}
                      onChange={(e) => setUseBigText(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-teal-700 rounded cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Ampliación #6: Formato intl */}
                  <label className="py-3 flex items-start justify-between gap-4 cursor-pointer">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        Formato intl (fechas y miles)
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ampliación #6: alterna entre entero puro y NumberFormat.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={useIntlFormat}
                      onChange={(e) => setUseIntlFormat(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-teal-700 rounded cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Ampliación #4: Consulta periódica tipo WorkManager */}
                  <div className="pt-3 space-y-2.5">
                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">
                          Consulta periódica (WorkManager)
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Ampliación #4: consulta cada 15 s y notifica solo si
                          cambia todayCases.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={periodicEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setPeriodicEnabled(enabled);
                          setPeriodicNote(
                            enabled
                              ? 'Activa: comprobando cambios en todayCases cada 15 s.'
                              : 'Inactiva. Actívala para comprobar cambios en todayCases cada 15 s.',
                          );
                        }}
                        className="mt-1 h-4 w-4 accent-teal-700 rounded cursor-pointer shrink-0"
                      />
                    </label>

                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {lastPeriodicCheck
                            ? `Última comprobación: ${formatDateBase(lastPeriodicCheck).split(' ')[1]}`
                            : 'Sin comprobaciones todavía'}
                        </span>
                      </div>
                      <p className="leading-relaxed">{periodicNote}</p>
                      <button
                        type="button"
                        onClick={() => void handleSimulateTodayCasesDelta()}
                        disabled={!data || airplaneMode}
                        className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-45"
                      >
                        Simular cambio en casos del día (+14)
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : activeTab === 'inspector' ? (
          <ApiInspectorView
            result={result}
            loading={loading}
            error={error}
            selectedCountry={selectedCountry}
            onReload={() => void loadCountryData(selectedCountry, airplaneMode)}
          />
        ) : (
          <FlutterCodeView />
        )}
      </main>

      {/* Pie de página limpio */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Réplica interactiva del taller covid_notify · Datos en vivo desde{' '}
            <a
              href="https://disease.sh/v3/covid-19/countries/colombia"
              target="_blank"
              rel="noreferrer"
              className="text-slate-700 underline hover:text-teal-700"
            >
              disease.sh
            </a>
          </span>
          <span>
            Arquitectura separada: modelo · servicio HTTP · notificaciones locales · interfaz
          </span>
        </div>
      </footer>
    </div>
  );
}
