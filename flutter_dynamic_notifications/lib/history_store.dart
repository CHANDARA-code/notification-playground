import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class PushHistoryEntry {
  PushHistoryEntry({
    required this.title,
    required this.body,
    required this.status,
    required this.timestamp,
    this.icon,
    this.iconUrl,
    this.leftIconUrl,
    this.imageUrl,
    this.messageId,
    this.error,
  });

  final String title;
  final String body;
  final String status;
  final DateTime timestamp;
  final String? icon;
  final String? iconUrl;
  final String? leftIconUrl;
  final String? imageUrl;
  final String? messageId;
  final String? error;

  Map<String, dynamic> toJson() => {
        'title': title,
        'body': body,
        'status': status,
        'timestamp': timestamp.toIso8601String(),
        'icon': icon,
        'iconUrl': iconUrl,
        'leftIconUrl': leftIconUrl,
        'imageUrl': imageUrl,
        'messageId': messageId,
        'error': error,
      };

  static PushHistoryEntry fromJson(Map<String, dynamic> json) {
    return PushHistoryEntry(
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      status: json['status'] as String? ?? 'unknown',
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ??
          DateTime.now(),
      icon: json['icon'] as String?,
      iconUrl: json['iconUrl'] as String?,
      leftIconUrl: json['leftIconUrl'] as String?,
      imageUrl: json['imageUrl'] as String?,
      messageId: json['messageId'] as String?,
      error: json['error'] as String?,
    );
  }
}

class PushHistoryStore {
  static const _key = 'push_history';
  static const _limit = 50;

  Future<List<PushHistoryEntry>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];

    final decoded = jsonDecode(raw);
    if (decoded is! List) return [];

    return decoded
        .whereType<Map<String, dynamic>>()
        .map(PushHistoryEntry.fromJson)
        .toList();
  }

  Future<void> add(PushHistoryEntry entry) async {
    final current = await load();
    final updated = [entry, ...current];
    if (updated.length > _limit) {
      updated.removeRange(_limit, updated.length);
    }

    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(updated.map((e) => e.toJson()).toList());
    await prefs.setString(_key, encoded);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
