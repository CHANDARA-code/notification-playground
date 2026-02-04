import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
    final leftIconUrl = _stringValue(data['left_icon_url']) ??
        _stringValue(data['iconUrl']);
    final imageUrl = _stringValue(data['imageUrl']);

    final largeIcon = await _downloadBitmap(leftIconUrl);
    final bigPicture = await _downloadBitmap(imageUrl);

    final androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDescription,
      importance: Importance.high,
      priority: Priority.high,
      icon: iconName,
      largeIcon: largeIcon ?? bigPicture,
      styleInformation: bigPicture == null
          ? null
          : BigPictureStyleInformation(
              bigPicture,
              largeIcon: largeIcon ?? bigPicture,
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
    String? leftIconUrl,
    String? imageUrl,
    String? androidPriority,
    String? apnsPriority,
    Map<String, dynamic>? data,
  }) async {
    final uri = Uri.parse('$apiBaseUrl/notifications/send');
    final payload = jsonEncode({
      'token': token,
      'title': title,
      'body': body,
      if (icon != null) 'icon': icon,
      if (leftIconUrl != null) 'left_icon_url': leftIconUrl,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (androidPriority != null) 'androidPriority': androidPriority,
      if (apnsPriority != null) 'apnsPriority': apnsPriority,
      if (data != null) 'data': data,
    });

    final responseBody = await _postJson(uri, payload);
    if (responseBody == null || responseBody.isEmpty) return null;
    return jsonDecode(responseBody) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> fetchRemoteConfig(String apiBaseUrl) async {
    final uri = Uri.parse('$apiBaseUrl/config');
    final responseBody = await _getJson(uri);
    if (responseBody == null || responseBody.isEmpty) return null;
    return jsonDecode(responseBody) as Map<String, dynamic>;
  }

  Future<void> syncRemoteConfig(String apiBaseUrl) async {
    try {
      final config = await fetchRemoteConfig(apiBaseUrl);
      if (config == null) return;

      final topics =
          _parseTopics(config['topics'] ?? config['topic']).toList();
      final androidPriority =
          _stringValue(config['androidPriority']) ??
              _stringValue(config['priority']) ??
              'high';
      final apnsPriority =
          _stringValue(config['apnsPriority']) ??
              _stringValue(config['priority']) ??
              androidPriority;

      final resolvedTopics = _filterTopicsForPlatform(topics);

      final prefs = await SharedPreferences.getInstance();
      final previousTopics = prefs.getStringList('push_topics') ?? <String>[];

      final previousSet = previousTopics.toSet();
      final nextSet = resolvedTopics.toSet();

      for (final topic in previousSet.difference(nextSet)) {
        if (topic.isEmpty) continue;
        await FirebaseMessaging.instance.unsubscribeFromTopic(topic);
      }

      for (final topic in nextSet.difference(previousSet)) {
        if (topic.isEmpty) continue;
        await FirebaseMessaging.instance.subscribeToTopic(topic);
      }

      await prefs.setStringList('push_topics', resolvedTopics);
      await prefs.setString('push_android_priority', androidPriority);
      await prefs.setString('push_apns_priority', apnsPriority);
    } catch (error, stack) {
      debugPrint('Remote config sync failed: $error');
      debugPrintStack(stackTrace: stack);
    }
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

  List<String> _parseTopics(Object? value) {
    if (value == null) return [];
    if (value is List) {
      return value
          .map((item) => item.toString().trim())
          .where((item) => item.isNotEmpty)
          .toList();
    }
    if (value is String) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) return [];
      if (trimmed.startsWith('[')) {
        try {
          final decoded = jsonDecode(trimmed);
          if (decoded is List) {
            return decoded
                .map((item) => item.toString().trim())
                .where((item) => item.isNotEmpty)
                .toList();
          }
        } catch (_) {}
      }
      return trimmed
          .split(',')
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList();
    }
    return [];
  }

  List<String> _filterTopicsForPlatform(List<String> topics) {
    final filtered = <String>[];
    final seen = <String>{};
    for (final topic in topics) {
      final lower = topic.toLowerCase();
      if (lower == 'android' && !Platform.isAndroid) continue;
      if (lower == 'ios' && !Platform.isIOS) continue;
      if (seen.add(topic)) {
        filtered.add(topic);
      }
    }
    return filtered;
  }

  Future<ByteArrayAndroidBitmap?> _downloadBitmap(String? url) async {
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

  Future<String?> _getJson(Uri uri) async {
    final client = HttpClient();
    try {
      final request = await client.getUrl(uri);
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
