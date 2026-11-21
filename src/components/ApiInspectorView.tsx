import React, { useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { FetchCountryResult } from '../services/covidApi';
import { formatDateBase } from '../models/covidData';
import { RUBRIC_ROWS, TROUBLESHOOTING_ROWS } from '../data/flutterProjectFiles';

interface ApiInspectorViewProps {
  result: FetchCountryResult | null;
  loading: boolean;
  error: string | null;
  selectedCountry: string;
  onReload: () => void;
}

export const ApiInspectorView: React.FC<ApiInspectorViewProps> = ({
  result,
  loading,
  error,
  selectedCountry,
  onReload,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);

  const formattedJson = result
    ? JSON.stringify(result.rawJson, null, 2)
    : '';

  const handleCopyJson = async () => {
    if (!formattedJson) return;
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // Ignore clipboard error in restricted frames
    }
  };

  const mappedRows = result
    ? [
        { jsonKey: 'country', dartType: 'String', value: result.data.country, meaning: 'Nombre del país' },
        { jsonKey: 'cases', dartType: 'int', value: String(result.data.cases), meaning: 'Casos acumulados' },
        { jsonKey: 'todayCases', dartType: 'int', value: String(result.data.todayCases), meaning: 'Casos del día' },
        { jsonKey: 'deaths', dartType: 'int', value: String(result.data.deaths), meaning: 'Muertes acumuladas' },
        { jsonKey: 'todayDeaths', dartType: 'int', value: String(result.data.todayDeaths), meaning: 'Muertes del día' },
        { jsonKey: 'recovered', dartType: 'int', value: String(result.data.recovered), meaning: 'Recuperados acumulados' },
        {
          jsonKey: 'updated',
          dartType: 'DateTime',
          value: `${result.data.updated.getTime()} -> ${formatDateBase(result.data.updated)}`,
          meaning: 'Fecha de actualización (ms desde 1970)',
        },
        {
          jsonKey: 'countryInfo.flag',
          dartType: 'String?',
          value: result.data.flagUrl ?? 'null',
          meaning: 'URL de bandera (Ampliación #1)',
        },
      ]
    : [];

  return (
    <div className="space-y-10">
      {/* Live endpoint header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Inspector de petición HTTP y mapeo del modelo
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Respuesta en tiempo real de disease.sh para {selectedCountry} convertida a la clase CovidData.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Repetir GET
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-semibold text-teal-700 shrink-0">
              GET
            </span>
            <code className="font-mono text-xs sm:text-sm text-slate-800 truncate">
              {result?.endpoint ??
                `https://disease.sh/v3/covid-19/countries/${encodeURIComponent(selectedCountry)}`}
            </code>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500 shrink-0 tabular-nums">
            {result ? (
              <>
                <span className="text-emerald-700 font-medium">
                  HTTP {result.statusCode} OK
                </span>
                <span aria-hidden="true">·</span>
                <span>{result.durationMs} ms</span>
                <span aria-hidden="true">·</span>
                <a
                  href={result.endpoint}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 hover:underline font-sans font-medium"
                >
                  Abrir JSON
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            ) : error ? (
              <span className="text-red-700 font-medium">Error de petición</span>
            ) : (
              <span>Consultando...</span>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
            No se pudo consultar: {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Typed model table */}
            <div className="lg:col-span-7 overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Campos mapeados en CovidData.fromJson
              </h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 pr-3 font-medium">Campo JSON</th>
                    <th className="py-2.5 px-3 font-medium">Tipo Dart</th>
                    <th className="py-2.5 px-3 font-medium">Significado</th>
                    <th className="py-2.5 pl-3 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappedRows.map((row) => (
                    <tr key={row.jsonKey} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-900">
                        {row.jsonKey}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-teal-700">
                        {row.dartType}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">
                        {row.meaning}
                      </td>
                      <td className="py-2.5 pl-3 font-mono text-xs text-slate-900 text-right tabular-nums max-w-[200px] truncate">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Raw JSON viewer */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  JSON crudo recibido
                </h3>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar JSON
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-auto max-h-[340px] leading-relaxed">
                {formattedJson}
              </pre>
            </div>
          </div>
        ) : null}
      </section>

      {/* Discussion notes + Evaluation rubric */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Conceptos clave del taller
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Respuestas técnicas a las preguntas de discusión de la guía.
            </p>
          </div>

          <div className="divide-y divide-slate-200 text-sm">
            <div className="py-4 first:pt-0">
              <h3 className="font-semibold text-slate-900">
                ¿Por qué se usa num? y no int directamente en CovidData.fromJson?
              </h3>
              <p className="text-slate-600 mt-1.5 leading-relaxed">
                En JSON no existe distinción estricta entre entero y flotante; una API puede devolver un campo numérico como{' '}
                <code className="font-mono text-xs text-slate-800">double</code> o{' '}
                <code className="font-mono text-xs text-slate-800">null</code> si omite el campo. Usar{' '}
                <code className="font-mono text-xs text-slate-800">(v as num?)?.toInt() ?? 0</code> acepta tanto{' '}
                <code className="font-mono text-xs text-slate-800">int</code> como{' '}
                <code className="font-mono text-xs text-slate-800">double</code> y evita una excepción de casteo o de valor nulo devolviendo 0 como valor seguro.
              </p>
            </div>

            <div className="py-4">
              <h3 className="font-semibold text-slate-900">
                ¿Por qué lanzar una excepción en lugar de devolver datos vacíos?
              </h3>
              <p className="text-slate-600 mt-1.5 leading-relaxed">
                Si <code className="font-mono text-xs text-slate-800">fetchCountry</code> devolviera ceros cuando hay error 404, 500 o timeout de 10 segundos, el usuario creería que el país tiene 0 casos. Lanzar una excepción permite que{' '}
                <code className="font-mono text-xs text-slate-800">FutureBuilder</code> entre en{' '}
                <code className="font-mono text-xs text-slate-800">snapshot.hasError</code> y muestre el botón Reintentar.
              </p>
            </div>

            <div className="py-4 last:pb-0">
              <h3 className="font-semibold text-slate-900">
                Canal de notificación e ID fijo 0 en Android
              </h3>
              <p className="text-slate-600 mt-1.5 leading-relaxed">
                Desde Android 8 toda notificación pertenece a un canal (aquí{' '}
                <code className="font-mono text-xs text-slate-800">covid_channel</code>) que controla sonido y visibilidad, y desde Android 13 el permiso{' '}
                <code className="font-mono text-xs text-slate-800">POST_NOTIFICATIONS</code> se solicita en tiempo de ejecución. Usar el{' '}
                <code className="font-mono text-xs text-slate-800">id: 0</code> hace que cada nueva notificación reemplace a la anterior en lugar de acumular alertas repetidas.
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Criterios de evaluación del taller
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Rúbrica sugerida en la sección 10 del documento.
          </p>

          <table className="w-full mt-5 text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-3 font-medium">Criterio</th>
                <th className="py-2 pl-3 font-medium text-right">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RUBRIC_ROWS.map((item) => (
                <tr key={item.criterion}>
                  <td className="py-3 pr-3 text-slate-700">{item.criterion}</td>
                  <td className="py-3 pl-3 text-right font-mono font-semibold text-teal-700 tabular-nums">
                    {item.weight}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Troubleshooting table from PDF */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Problemas frecuentes en Android y Flutter
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Guía rápida de diagnóstico de la sección 9 al compilar el proyecto Flutter en emulador o dispositivo físico.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Síntoma</th>
                <th className="py-2.5 px-4 font-medium">Causa probable</th>
                <th className="py-2.5 pl-4 font-medium">Solución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TROUBLESHOOTING_ROWS.map((row) => (
                <tr key={row.symptom} className="hover:bg-slate-50/70">
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    {row.symptom}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{row.cause}</td>
                  <td className="py-3 pl-4 text-slate-700">{row.solution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
