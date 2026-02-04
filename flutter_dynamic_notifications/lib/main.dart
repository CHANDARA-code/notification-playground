import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'notification_service.dart';
import 'playground_screen.dart';

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://192.168.22.35:3000',
);

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  await NotificationService.instance.ensureInitialized();
  await NotificationService.instance.showFromRemoteMessage(message);
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await NotificationService.instance.ensureInitialized();

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  FirebaseMessaging.onMessage.listen(
    NotificationService.instance.showFromRemoteMessage,
  );

  await NotificationService.instance.registerDeviceToken(kApiBaseUrl);
  FirebaseMessaging.instance.onTokenRefresh.listen(
    (token) => NotificationService.instance.registerDeviceToken(
      kApiBaseUrl,
      tokenOverride: token,
    ),
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dynamic Icon Notifications',
      theme: ThemeData(useMaterial3: true),
      home: const PlaygroundScreen(apiBaseUrl: kApiBaseUrl),
    );
  }
}
