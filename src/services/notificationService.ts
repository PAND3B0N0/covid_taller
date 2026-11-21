import {
  CovidData,
  formatDateBase,
  formatDateIntl,
  formatNumber,
} from '../models/covidData';

/**
 * Servicio de notificaciones locales equivalente a lib/notification_service.dart.
 *
 * En Android usa `flutter_local_notifications` con canal `covid_channel` e id fijo 0
 * (cada notificación nueva reemplaza a la anterior). En web intenta usar la API nativa
 * `Notification` cuando está permitida y siempre entrega la notificación en la bandeja local
 * de la aplicación para que funcione sin restricciones dentro de cualquier navegador o iframe.
 */

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface LocalNotificationPayload {
  id: 0;
  channelId: 'covid_channel';
  channelName: 'Datos COVID';
  channelDescription: 'Resumen de datos de COVID-19';
  title: string;
  body: string;
  bigText?: string;
  sentAt: Date;
  deliveredViaBrowser: boolean;
  triggerSource: 'manual' | 'workmanager';
}

export class NotificationService {
  static getPermissionStatus(): PermissionStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission;
  }

  static async requestPermission(): Promise<PermissionStatus> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const result = await window.Notification.requestPermission();
      return result;
    } catch {
      return window.Notification.permission;
    }
  }

  static buildPayload(
    data: CovidData,
    options: {
      bigTextEnabled: boolean;
      useIntl: boolean;
      triggerSource: 'manual' | 'workmanager';
    },
  ): Omit<LocalNotificationPayload, 'deliveredViaBrowser'> {
    const casesStr = formatNumber(data.cases, options.useIntl);
    const deathsStr = formatNumber(data.deaths, options.useIntl);
    const todayCasesStr = formatNumber(data.todayCases, options.useIntl);
    const todayDeathsStr = formatNumber(data.todayDeaths, options.useIntl);
    const recoveredStr = formatNumber(data.recovered, options.useIntl);
    const updatedStr = options.useIntl
      ? formatDateIntl(data.updated)
      : formatDateBase(data.updated);

    const compactBody = `Casos: ${casesStr} | Muertes: ${deathsStr} | Hoy: ${todayCasesStr}`;

    const bigText = options.bigTextEnabled
      ? [
          `Casos acumulados: ${casesStr}`,
          `Casos del día: ${todayCasesStr}`,
          `Muertes acumuladas: ${deathsStr}`,
          `Muertes del día: ${todayDeathsStr}`,
          `Recuperados: ${recoveredStr}`,
          `Actualizado: ${updatedStr}`,
        ].join('\n')
      : undefined;

    return {
      id: 0,
      channelId: 'covid_channel',
      channelName: 'Datos COVID',
      channelDescription: 'Resumen de datos de COVID-19',
      title: `COVID-19: ${data.country}`,
      body: compactBody,
      bigText,
      sentAt: new Date(),
      triggerSource: options.triggerSource,
    };
  }

  static async show(
    data: CovidData,
    options: {
      bigTextEnabled: boolean;
      useIntl: boolean;
      triggerSource?: 'manual' | 'workmanager';
    },
  ): Promise<LocalNotificationPayload> {
    const draft = this.buildPayload(data, {
      bigTextEnabled: options.bigTextEnabled,
      useIntl: options.useIntl,
      triggerSource: options.triggerSource ?? 'manual',
    });

    let deliveredViaBrowser = false;

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(draft.title, {
          body: draft.bigText ?? draft.body,
          tag: 'covid_channel_id_0', // Reemplaza la notificación anterior (igual que id: 0)
        });
        deliveredViaBrowser = true;
      } catch {
        deliveredViaBrowser = false;
      }
    }

    return {
      ...draft,
      deliveredViaBrowser,
    };
  }
}
