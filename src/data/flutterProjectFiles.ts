export interface FlutterFileSpec {
  id: string;
  path: string;
  label: string;
  language: 'yaml' | 'xml' | 'kotlin' | 'dart';
  section: string;
  description: string;
  baseCode: string;
  extendedCode: string;
}

export const FLUTTER_PROJECT_FILES: FlutterFileSpec[] = [
  {
    id: 'pubspec',
    path: 'pubspec.yaml',
    label: 'pubspec.yaml',
    language: 'yaml',
    section: 'Sección 3 · Dependencias',
    description:
      'Versiones fijadas exactamente como pide el taller (no usar flutter pub add para evitar incompatibilidades con flutter_local_notifications > 19).',
    baseCode: `name: covid_notify
description: Taller Flutter - Consumo de API COVID-19 y notificaciones locales.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  flutter_local_notifications: ^19.0.0

flutter:
  uses-material-design: true`,
    extendedCode: `name: covid_notify
description: Taller Flutter - Consumo de API COVID-19, notificaciones locales y ampliaciones.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  flutter_local_notifications: ^19.0.0
  intl: ^0.19.0

flutter:
  uses-material-design: true`,
  },
  {
    id: 'manifest',
    path: 'android/app/src/main/AndroidManifest.xml',
    label: 'AndroidManifest.xml',
    language: 'xml',
    section: 'Sección 4.1 · Permisos Android',
    description:
      'Declara INTERNET (obligatorio en modo release) y POST_NOTIFICATIONS (obligatorio desde Android 13 / API 33).',
    baseCode: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

    <application
        android:label="covid_notify"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <!-- Mantener las actividades generadas por flutter create -->
    </application>
</manifest>`,
    extendedCode: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

    <application
        android:label="covid_notify"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <!-- Mantener las actividades generadas por flutter create -->
    </application>
</manifest>`,
  },
  {
    id: 'gradle',
    path: 'android/app/build.gradle.kts',
    label: 'build.gradle.kts',
    language: 'kotlin',
    section: 'Sección 4.2 · Desugaring',
    description:
      'Habilita coreLibraryDesugaring requerido por flutter_local_notifications sin sobrescribir sourceCompatibility ni targetCompatibility.',
    baseCode: `android {
    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        // Dejar sourceCompatibility y targetCompatibility como vienen en el proyecto
        // (Java 11 o 17 sirven; deben coincidir con jvmTarget en kotlinOptions).
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}`,
    extendedCode: `android {
    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        // Dejar sourceCompatibility y targetCompatibility como vienen en el proyecto
        // (Java 11 o 17 sirven; deben coincidir con jvmTarget en kotlinOptions).
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}`,
  },
  {
    id: 'model',
    path: 'lib/covid_data.dart',
    label: 'covid_data.dart',
    language: 'dart',
    section: 'Sección 5 · Modelo',
    description:
      'Convierte el JSON (Map<String, dynamic>) en un objeto tipado usando num? para tolerar enteros, decimales o campos omitidos.',
    baseCode: `class CovidData {
  final String country;
  final int cases;
  final int todayCases;
  final int deaths;
  final int todayDeaths;
  final int recovered;
  final DateTime updated;

  CovidData({
    required this.country,
    required this.cases,
    required this.todayCases,
    required this.deaths,
    required this.todayDeaths,
    required this.recovered,
    required this.updated,
  });

  factory CovidData.fromJson(Map<String, dynamic> json) {
    int toInt(dynamic v) => (v as num?)?.toInt() ?? 0;

    return CovidData(
      country: json['country'] as String,
      cases: toInt(json['cases']),
      todayCases: toInt(json['todayCases']),
      deaths: toInt(json['deaths']),
      todayDeaths: toInt(json['todayDeaths']),
      recovered: toInt(json['recovered']),
      updated: DateTime.fromMillisecondsSinceEpoch(toInt(json['updated'])),
    );
  }
}`,
    extendedCode: `class CovidData {
  final String country;
  final int cases;
  final int todayCases;
  final int deaths;
  final int todayDeaths;
  final int recovered;
  final DateTime updated;
  final String? flagUrl;

  CovidData({
    required this.country,
    required this.cases,
    required this.todayCases,
    required this.deaths,
    required this.todayDeaths,
    required this.recovered,
    required this.updated,
    this.flagUrl,
  });

  factory CovidData.fromJson(Map<String, dynamic> json) {
    int toInt(dynamic v) => (v as num?)?.toInt() ?? 0;
    final info = json['countryInfo'] as Map<String, dynamic>?;

    return CovidData(
      country: json['country'] as String,
      cases: toInt(json['cases']),
      todayCases: toInt(json['todayCases']),
      deaths: toInt(json['deaths']),
      todayDeaths: toInt(json['todayDeaths']),
      recovered: toInt(json['recovered']),
      updated: DateTime.fromMillisecondsSinceEpoch(toInt(json['updated'])),
      flagUrl: info?['flag'] as String?,
    );
  }
}`,
  },
  {
    id: 'api',
    path: 'lib/covid_api.dart',
    label: 'covid_api.dart',
    language: 'dart',
    section: 'Sección 6 · Servicio de API',
    description:
      'Ejecuta peticiones HTTP GET con timeout de 10 segundos y lanza excepciones explícitas si statusCode != 200.',
    baseCode: `import 'dart:convert';
import 'package:http/http.dart' as http;
import 'covid_data.dart';

Future<CovidData> fetchCountry(String country) async {
  final uri = Uri.https(
    'disease.sh',
    '/v3/covid-19/countries/\${Uri.encodeComponent(country)}',
  );

  final response = await http.get(uri).timeout(const Duration(seconds: 10));

  if (response.statusCode != 200) {
    throw Exception('Error del servidor: \${response.statusCode}');
  }

  return CovidData.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
}`,
    extendedCode: `import 'dart:convert';
import 'package:http/http.dart' as http;
import 'covid_data.dart';

Future<CovidData> fetchCountry(String country) async {
  final uri = Uri.https(
    'disease.sh',
    '/v3/covid-19/countries/\${Uri.encodeComponent(country)}',
  );

  final response = await http.get(uri).timeout(const Duration(seconds: 10));

  if (response.statusCode != 200) {
    throw Exception('Error del servidor: \${response.statusCode}');
  }

  return CovidData.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
}

Future<List<String>> fetchCountryList() async {
  final uri = Uri.https('disease.sh', '/v3/covid-19/countries');
  final response = await http.get(uri).timeout(const Duration(seconds: 10));

  if (response.statusCode != 200) {
    throw Exception('Error del servidor: \${response.statusCode}');
  }

  final list = jsonDecode(response.body) as List<dynamic>;
  return list
      .map((e) => (e as Map<String, dynamic>)['country'] as String)
      .toList()
    ..sort();
}`,
  },
  {
    id: 'notifications',
    path: 'lib/notification_service.dart',
    label: 'notification_service.dart',
    language: 'dart',
    section: 'Sección 7 · Notificaciones locales',
    description:
      'Inicializa el plugin, solicita permiso en Android 13+, configura el canal covid_channel y reemplaza siempre el id 0.',
    baseCode: `import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: androidSettings),
    );

    // Android 13 o superior: pedir permiso al usuario.
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  static Future<void> show({
    required String title,
    required String body,
  }) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'covid_channel',
        'Datos COVID',
        channelDescription: 'Resumen de datos de COVID-19',
        importance: Importance.high,
        priority: Priority.high,
      ),
    );

    // El id 0 es fijo: cada notificación nueva reemplaza a la anterior.
    await _plugin.show(0, title, body, details);
  }
}`,
    extendedCode: `import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: androidSettings),
    );

    // Android 13 o superior: pedir permiso al usuario.
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  static Future<void> show({
    required String title,
    required String body,
    String? bigText,
  }) async {
    final style = bigText != null
        ? BigTextStyleInformation(bigText, contentTitle: title)
        : null;

    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        'covid_channel',
        'Datos COVID',
        channelDescription: 'Resumen de datos de COVID-19',
        importance: Importance.high,
        priority: Priority.high,
        styleInformation: style,
      ),
    );

    // El id 0 es fijo: cada notificación nueva reemplaza a la anterior.
    await _plugin.show(0, title, body, details);
  }
}`,
  },
  {
    id: 'main',
    path: 'lib/main.dart',
    label: 'main.dart',
    language: 'dart',
    section: 'Sección 8 · Interfaz',
    description:
      'Scaffold con selector de país, FutureBuilder para estados de carga/error/datos, botón Reintentar y FilledButton para notificar.',
    baseCode: `import 'package:flutter/material.dart';
import 'covid_api.dart';
import 'covid_data.dart';
import 'notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.init();
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: HomePage(),
  ));
}

String formatDate(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '\${two(d.day)}/\${two(d.month)}/\${d.year} \${two(d.hour)}:\${two(d.minute)}';
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const countries = [
    'Colombia',
    'Mexico',
    'Argentina',
    'Peru',
    'Chile',
    'Spain',
    'USA',
  ];

  String selected = 'Colombia';
  late Future<CovidData> future = fetchCountry(selected);

  void _reload() {
    setState(() {
      future = fetchCountry(selected);
    });
  }

  Future<void> _notify(CovidData d) async {
    await NotificationService.show(
      title: 'COVID-19: \${d.country}',
      body: 'Casos: \${d.cases} | Muertes: \${d.deaths} | Hoy: \${d.todayCases}',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Datos COVID-19')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButton<String>(
              value: selected,
              isExpanded: true,
              items: countries
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (value) {
                if (value == null) return;
                selected = value;
                _reload();
              },
            ),
            const SizedBox(height: 16),
            Expanded(
              child: FutureBuilder<CovidData>(
                future: future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('No se pudo consultar: \${snapshot.error}'),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _reload,
                            child: const Text('Reintentar'),
                          ),
                        ],
                      ),
                    );
                  }

                  final d = snapshot.data!;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(d.country,
                          style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 12),
                      Text('Casos acumulados: \${d.cases}'),
                      Text('Casos del día: \${d.todayCases}'),
                      Text('Muertes acumuladas: \${d.deaths}'),
                      Text('Muertes del día: \${d.todayDeaths}'),
                      Text('Recuperados: \${d.recovered}'),
                      Text('Actualizado: \${formatDate(d.updated)}'),
                      const Spacer(),
                      FilledButton(
                        onPressed: () => _notify(d),
                        child: const Text('Enviar notificación'),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}`,
    extendedCode: `import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'covid_api.dart';
import 'covid_data.dart';
import 'notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.init();
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: HomePage(),
  ));
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _numFmt = NumberFormat.decimalPattern('es_CO');
  final _dateFmt = DateFormat('dd/MM/yyyy HH:mm');

  List<String> countries = ['Colombia', 'Mexico', 'Argentina', 'Peru', 'Chile', 'Spain', 'USA'];
  String selected = 'Colombia';
  late Future<CovidData> future = fetchCountry(selected);

  @override
  void initState() {
    super.initState();
    _loadCountries();
  }

  Future<void> _loadCountries() async {
    try {
      final list = await fetchCountryList();
      if (mounted && list.isNotEmpty) {
        setState(() {
          countries = list;
          if (!countries.contains(selected)) selected = countries.first;
        });
      }
    } catch (_) {}
  }

  void _reload() {
    setState(() {
      future = fetchCountry(selected);
    });
  }

  Future<void> _notify(CovidData d) async {
    final bigText = [
      'Casos acumulados: \${_numFmt.format(d.cases)}',
      'Casos del día: \${_numFmt.format(d.todayCases)}',
      'Muertes acumuladas: \${_numFmt.format(d.deaths)}',
      'Muertes del día: \${_numFmt.format(d.todayDeaths)}',
      'Recuperados: \${_numFmt.format(d.recovered)}',
      'Actualizado: \${_dateFmt.format(d.updated)}',
    ].join('\\n');

    await NotificationService.show(
      title: 'COVID-19: \${d.country}',
      body: 'Casos: \${_numFmt.format(d.cases)} | Muertes: \${_numFmt.format(d.deaths)}',
      bigText: bigText,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Datos COVID-19')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButton<String>(
              value: selected,
              isExpanded: true,
              items: countries
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (value) {
                if (value == null) return;
                selected = value;
                _reload();
              },
            ),
            const SizedBox(height: 16),
            Expanded(
              child: FutureBuilder<CovidData>(
                future: future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('No se pudo consultar: \${snapshot.error}'),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _reload,
                            child: const Text('Reintentar'),
                          ),
                        ],
                      ),
                    );
                  }

                  final d = snapshot.data!;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          if (d.flagUrl != null)
                            Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: Image.network(d.flagUrl!, width: 44, height: 28, fit: BoxFit.cover),
                            ),
                          Expanded(
                            child: Text(d.country,
                                style: Theme.of(context).textTheme.headlineMedium),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _StatTile(label: 'Casos acumulados', value: _numFmt.format(d.cases)),
                      _StatTile(label: 'Casos del día', value: _numFmt.format(d.todayCases)),
                      _StatTile(label: 'Muertes acumuladas', value: _numFmt.format(d.deaths)),
                      _StatTile(label: 'Muertes del día', value: _numFmt.format(d.todayDeaths)),
                      _StatTile(label: 'Recuperados', value: _numFmt.format(d.recovered)),
                      _StatTile(label: 'Actualizado', value: _dateFmt.format(d.updated)),
                      const Spacer(),
                      FilledButton(
                        onPressed: () => _notify(d),
                        child: const Text('Enviar notificación'),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  const _StatTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        dense: true,
        title: Text(label),
        trailing: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }
}`,
  },
];

export const TROUBLESHOOTING_ROWS = [
  {
    symptom: 'Error de compilación mencionando desugaring',
    cause: 'No se habilitó coreLibraryDesugaring',
    solution: 'Revisar la sección 4.2 en android/app/build.gradle.kts',
  },
  {
    symptom: 'Error de compilación en initialize o show',
    cause: 'Se instaló una versión del plugin mayor que la 19',
    solution: 'Dejar ^19.0.0 en pubspec.yaml y ejecutar flutter pub get',
  },
  {
    symptom: 'Error por versiones de Java o Kotlin',
    cause: 'Se reemplazó el bloque compileOptions completo',
    solution:
      'Conservar los valores originales y agregar solo isCoreLibraryDesugaringEnabled = true',
  },
  {
    symptom: 'La notificación no aparece',
    cause: 'Permiso denegado o ausente',
    solution: 'Revisar los ajustes de la app en el dispositivo y el permiso en el manifiesto',
  },
  {
    symptom: 'La app abre sin datos en release',
    cause: 'Falta el permiso INTERNET',
    solution: 'Revisar la sección 4.1 en AndroidManifest.xml',
  },
  {
    symptom: 'Error 404 al consultar',
    cause: 'Nombre de país no reconocido por la API',
    solution: 'Usar nombres en inglés (Spain, USA)',
  },
  {
    symptom: 'Pantalla en blanco al cargar',
    cause: 'Excepción no mostrada',
    solution: 'Revisar la consola con flutter run',
  },
];

export const RUBRIC_ROWS = [
  { criterion: 'La app consulta la API y muestra los datos correctamente', weight: '30%' },
  { criterion: 'El modelo y el servicio están separados de la interfaz', weight: '20%' },
  { criterion: 'La notificación se envía con los datos del país elegido', weight: '25%' },
  { criterion: 'Manejo de errores y estado de carga', weight: '15%' },
  { criterion: 'Ejercicio de ampliación realizado', weight: '10%' },
];
