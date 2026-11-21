import React, { useState } from 'react';
import { Bell, ChevronDown, ChevronUp, X } from 'lucide-react';
import { LocalNotificationPayload } from '../services/notificationService';
import { formatDateBase } from '../models/covidData';

interface NotificationBannerProps {
  notification: LocalNotificationPayload | null;
  onDismiss: () => void;
}

/**
 * Representación visual de la notificación local de Android (canal covid_channel, id 0).
 * Aparece en la parte superior y cada nuevo envío reemplaza la instancia anterior.
 */
export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(true);

  if (!notification) return null;

  const hasBigText = Boolean(notification.bigText);
  const timeText = formatDateBase(notification.sentAt).split(' ')[1] ?? '';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white border border-slate-300 rounded-2xl shadow-lg p-4 transition-all duration-200 ease-out"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">
              {notification.channelName} · id {notification.id} · {timeText}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {hasBigText ? (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
                  aria-label={expanded ? 'Contraer notificación' : 'Expandir notificación'}
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="font-semibold text-sm text-slate-900 mt-1">
            {notification.title}
          </p>

          {hasBigText && expanded ? (
            <pre className="mt-1.5 text-xs text-slate-700 font-sans whitespace-pre-line leading-relaxed">
              {notification.bigText}
            </pre>
          ) : (
            <p className="mt-1 text-xs text-slate-700 leading-relaxed">
              {notification.body}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-500">
            {notification.deliveredViaBrowser
              ? 'Entregada también mediante la API de notificaciones del navegador.'
              : 'Mostrada en la bandeja local (canal covid_channel).'}
          </p>
        </div>
      </div>
    </div>
  );
};
