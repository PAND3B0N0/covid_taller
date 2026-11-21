import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { FLUTTER_PROJECT_FILES } from '../data/flutterProjectFiles';

export const FlutterCodeView: React.FC = () => {
  const [variant, setVariant] = useState<'base' | 'extended'>('base');
  const [selectedId, setSelectedId] = useState<string>(
    FLUTTER_PROJECT_FILES[0].id,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeFile =
    FLUTTER_PROJECT_FILES.find((f) => f.id === selectedId) ??
    FLUTTER_PROJECT_FILES[0];
  const code = variant === 'base' ? activeFile.baseCode : activeFile.extendedCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(activeFile.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard might be restricted in some iframes
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.label;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Proyecto Flutter: covid_notify
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Archivos listos para crear con{' '}
            <code className="font-mono text-xs text-slate-800">
              flutter create covid_notify
            </code>
            , copiar exactamente estas versiones en{' '}
            <code className="font-mono text-xs text-slate-800">pubspec.yaml</code>{' '}
            y ejecutar{' '}
            <code className="font-mono text-xs text-slate-800">flutter pub get</code>{' '}
            y{' '}
            <code className="font-mono text-xs text-slate-800">flutter run</code>.
          </p>
        </div>

        {/* Interactive variant segmented control */}
        <div
          className="inline-flex items-center p-1 bg-slate-200/70 rounded-xl self-start md:self-auto shrink-0"
          role="tablist"
          aria-label="Versión del código Flutter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={variant === 'base'}
            onClick={() => setVariant('base')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              variant === 'base'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Versión base (PDF)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={variant === 'extended'}
            onClick={() => setVariant('extended')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              variant === 'extended'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Versión con ampliaciones
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File tree sidebar */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-3">
          <div className="px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
            Estructura del proyecto (7 archivos)
          </div>
          <nav className="mt-2 space-y-1" aria-label="Archivos del proyecto Flutter">
            {FLUTTER_PROJECT_FILES.map((file) => {
              const isSelected = file.id === activeFile.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedId(file.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-teal-50 text-teal-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileCode2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isSelected ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-medium truncate">
                      {file.path}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {file.section}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Code viewer panel */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold text-slate-900 truncate">
                {activeFile.path}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {activeFile.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedId === activeFile.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
            </div>
          </div>

          <pre className="bg-slate-900 text-slate-100 p-5 text-xs sm:text-[13px] font-mono overflow-x-auto leading-relaxed max-h-[600px]">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
