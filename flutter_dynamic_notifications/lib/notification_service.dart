import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  static const String _channelId = 'high_importance';
  static const String _channelName = 'High Importance Notifications';
  static const String _channelDescription =
      'Used for important notifications with custom icons.';

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  static const Set<String> _allowedAndroidIcons = {
    'ic_notif_default',
    'ic_notif_sale',
    'ic_notif_chat',
    'ic_notif_alert',
  };

  Future<void> ensureInitialized() async {
    if (_initialized) return;

    const androidInit = AndroidInitializationSettings('ic_notif_default');
    const iosInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidInit,
      iOS: iosInit,
    );

    await _localNotifications.initialize(settings: initSettings);

    const channel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDescription,
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();

    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: false,
      badge: false,
      sound: false,
    );

    _initialized = true;
  }

  Future<void> showFromRemoteMessage(RemoteMessage message) async {
    final data = message.data;
    final title = _stringValue(data['title']) ?? message.notification?.title;
    final body = _stringValue(data['body']) ?? message.notification?.body;

    if (title == null || title.isEmpty) return;

    final iconName = _resolveSmallIcon(_stringValue(data['icon']));
    final imageUrl = _stringValue(data['imageUrl']);

    final bigPicture = await _downloadBigPicture(imageUrl);

    final androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDescription,
      importance: Importance.high,
      priority: Priority.high,
      icon: iconName,
      largeIcon: bigPicture,
      styleInformation: bigPicture == null
          ? null
          : BigPictureStyleInformation(
              bigPicture,
              largeIcon: bigPicture,
              contentTitle: title,
              summaryText: body,
            ),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final id = message.messageId?.hashCode ??
        DateTime.now().millisecondsSinceEpoch ~/ 1000;

    await _localNotifications.show(
      id: id,
      title: title,
      body: body,
      notificationDetails:
          NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: jsonEncode(data),
    );
  }

  Future<void> registerDeviceToken(
    String apiBaseUrl, {
    String? tokenOverride,
  }) async {
    try {
      final token = tokenOverride ?? await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) return;

      final uri = Uri.parse('$apiBaseUrl/devices/register');
      final payload = jsonEncode({
        'token': token,
        'platform': Platform.operatingSystem,
      });

      await _postJson(uri, payload);
    } catch (error, stack) {
      debugPrint('Token registration failed: $error');
      debugPrintStack(stackTrace: stack);
    }
  }

  Future<String?> fetchToken() => FirebaseMessaging.instance.getToken();

  Future<Map<String, dynamic>?> sendTestPush(
    String apiBaseUrl, {
    required String token,
    required String title,
    required String body,
    String? icon,
    String? imageUrl,
    Map<String, dynamic>? data,
  }) async {
    final uri = Uri.parse('$apiBaseUrl/notifications/send');
    final payload = jsonEncode({
      'token': token,
      'title': title,
      'body': body,
      if (icon != null) 'icon': icon,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (data != null) 'data': data,
    });

    final responseBody = await _postJson(uri, payload);
    if (responseBody == null || responseBody.isEmpty) return null;
    return jsonDecode(responseBody) as Map<String, dynamic>;
  }

  String _resolveSmallIcon(String? requested) {
    if (requested != null && _allowedAndroidIcons.contains(requested)) {
      return requested;
    }
    return 'ic_notif_default';
  }

  String? _stringValue(Object? value) {
    if (value == null) return null;
    return value.toString();
  }

  Future<ByteArrayAndroidBitmap?> _downloadBigPicture(String? url) async {
    if (url == null || url.isEmpty) return null;

    final bytes = await _downloadBytes(url);
    if (bytes == null) return null;

    return ByteArrayAndroidBitmap(bytes);
  }

  Future<Uint8List?> _downloadBytes(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;

    final client = HttpClient();
    try {
      final request = await client.getUrl(uri);
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }
      return consolidateHttpClientResponseBytes(response);
    } finally {
      client.close();
    }
  }

  Future<String?> _postJson(Uri uri, String payload) async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(uri);
      request.headers.contentType = ContentType.json;
      request.add(utf8.encode(payload));
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final errorBody = await response.transform(utf8.decoder).join();
        throw HttpException(
          errorBody.isEmpty ? 'Request failed' : errorBody,
          uri: uri,
        );
      }
      return response.transform(utf8.decoder).join();
    } finally {
      client.close();
    }
  }
}
