import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'history_store.dart';
import 'notification_service.dart';

class PlaygroundScreen extends StatefulWidget {
  const PlaygroundScreen({super.key, required this.apiBaseUrl});

  final String apiBaseUrl;

  @override
  State<PlaygroundScreen> createState() => _PlaygroundScreenState();
}

class _PlaygroundScreenState extends State<PlaygroundScreen> {
  final _tokenController = TextEditingController();
  final _titleController = TextEditingController(text: 'Sale now live');
  final _bodyController = TextEditingController(text: 'Tap to view the deal');
  final _leftIconUrlController = TextEditingController(
    text:
        'https://static.vecteezy.com/system/resources/thumbnails/048/942/306/small/dog-face-cartoon-icon-vector.jpg',
  );
  final _imageUrlController = TextEditingController(
    text:
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80',
  );
  final _dataController = TextEditingController(
    text: const JsonEncoder.withIndent('  ').convert({
      'screen': 'promo',
      'campaign': 'spring_launch',
    }),
  );

  final String _icon = 'ic_notif_default';
  String _androidPriority = 'high';
  String _apnsPriority = 'high';
  bool _sending = false;
  String? _status;
  String? _error;
  Map<String, dynamic>? _lastResponse;
  final _historyStore = PushHistoryStore();
  List<PushHistoryEntry> _history = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _titleController.dispose();
    _bodyController.dispose();
    _leftIconUrlController.dispose();
    _imageUrlController.dispose();
    _dataController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    final entries = await _historyStore.load();
    if (!mounted) return;
    setState(() {
      _history = entries;
    });
  }

  Future<void> _saveHistory({
    required String status,
    String? messageId,
    String? error,
  }) async {
    final entry = PushHistoryEntry(
      title: _titleController.text.trim(),
      body: _bodyController.text.trim(),
      status: status,
      timestamp: DateTime.now(),
      icon: _icon,
      iconUrl: _leftIconUrlController.text.trim().isEmpty
          ? null
          : _leftIconUrlController.text.trim(),
      leftIconUrl: _leftIconUrlController.text.trim().isEmpty
          ? null
          : _leftIconUrlController.text.trim(),
      imageUrl: _imageUrlController.text.trim().isEmpty
          ? null
          : _imageUrlController.text.trim(),
      messageId: messageId,
      error: error,
    );
    await _historyStore.add(entry);
    await _loadHistory();
  }

  Future<void> _loadToken() async {
    final token = await NotificationService.instance.fetchToken();
    if (!mounted) return;
    if (token == null || token.isEmpty) {
      setState(() {
        _error =
            'FCM token is not available. Check Firebase config and permissions.';
      });
      return;
    }

    await Clipboard.setData(ClipboardData(text: token));
    setState(() {
      _tokenController.text = token;
      _status = 'Token loaded & copied.';
      _error = null;
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('FCM token copied to clipboard')),
    );
  }

  Future<void> _send() async {
    setState(() {
      _sending = true;
      _status = 'Sending...';
      _error = null;
    });

    final token = _tokenController.text.trim();
    final title = _titleController.text.trim();
    final body = _bodyController.text.trim();
    final leftIconUrl = _leftIconUrlController.text.trim();
    final imageUrl = _imageUrlController.text.trim();
    final rawData = _dataController.text.trim();

    if (token.isEmpty || title.isEmpty || body.isEmpty) {
      setState(() {
        _sending = false;
        _status = null;
        _error = 'Token, title, and body are required.';
      });
      return;
    }

    Map<String, dynamic>? data;
    if (rawData.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawData);
        if (decoded is Map<String, dynamic>) {
          data = decoded;
        } else {
          throw const FormatException('Custom data must be a JSON object.');
        }
      } catch (err) {
        setState(() {
          _sending = false;
          _status = null;
          _error = 'Custom data must be valid JSON.';
        });
        return;
      }
    }

    try {
      final response = await NotificationService.instance.sendTestPush(
        widget.apiBaseUrl,
        token: token,
        title: title,
        body: body,
        icon: _icon,
        leftIconUrl: leftIconUrl.isEmpty ? null : leftIconUrl,
        imageUrl: imageUrl.isEmpty ? null : imageUrl,
        androidPriority: _androidPriority,
        apnsPriority: _apnsPriority,
        data: data,
      );

      if (!mounted) return;
      setState(() {
        _sending = false;
        _status = 'Delivered to FCM.';
        _lastResponse = response;
      });
      await _saveHistory(
        status: 'sent',
        messageId: response?['messageId']?.toString(),
      );
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _status = null;
        _error = err.toString();
      });
      await _saveHistory(status: 'error', error: err.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Push Playground'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'API: ${widget.apiBaseUrl}',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Target token',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _tokenController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'Paste the FCM token from this device',
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: OutlinedButton.icon(
                    onPressed: _loadToken,
                    icon: const Icon(Icons.copy),
                    label: const Text('Load my token'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Notification content',
            child: Column(
              children: [
                TextField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    labelText: 'Title',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _bodyController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    labelText: 'Body',
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _androidPriority,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          labelText: 'Android priority',
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'high',
                            child: Text('high'),
                          ),
                          DropdownMenuItem(
                            value: 'normal',
                            child: Text('normal'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() {
                            _androidPriority = value;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _apnsPriority,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          labelText: 'iOS priority',
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'high',
                            child: Text('high'),
                          ),
                          DropdownMenuItem(
                            value: 'normal',
                            child: Text('normal'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() {
                            _apnsPriority = value;
                          });
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Small icon is fixed to ic_notif_default (Android requirement).',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _leftIconUrlController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    labelText: 'Left icon URL (large icon)',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _imageUrlController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    labelText: 'Image URL (optional)',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Section(
            title: 'Custom data (JSON)',
            child: TextField(
              controller: _dataController,
              maxLines: 6,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: '{ "screen": "promo" }',
              ),
            ),
          ),
          const SizedBox(height: 20),
          if (_error != null)
            _Notice(
              text: _error!,
              background: Colors.red.shade50,
              foreground: Colors.red.shade700,
            ),
          if (_status != null)
            _Notice(
              text: _status!,
              background: Colors.blue.shade50,
              foreground: Colors.blue.shade700,
            ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _sending ? null : _send,
            child: Text(_sending ? 'Sending...' : 'Send test push'),
          ),
          const SizedBox(height: 20),
          _Section(
            title: 'Last response',
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.black12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _lastResponse == null
                    ? '—'
                    : const JsonEncoder.withIndent('  ').convert(_lastResponse),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ),
          const SizedBox(height: 20),
          _Section(
            title: 'History (local)',
            child: _history.isEmpty
                ? const Text('No history yet.')
                : Column(
                    children: _history
                        .take(10)
                        .map(
                          (entry) => ListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              entry.title,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            subtitle: Text(
                              '${entry.status} • ${entry.timestamp.toLocal()}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                        )
                        .toList(),
                  ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({
    required this.text,
    required this.background,
    required this.foreground,
  });

  final String text;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: foreground,
            ),
      ),
    );
  }
}
