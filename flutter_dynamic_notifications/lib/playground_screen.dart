import 'dart:convert';

import 'package:flutter/material.dart';

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

  String _icon = 'ic_notif_sale';
  bool _sending = false;
  String? _status;
  String? _error;
  Map<String, dynamic>? _lastResponse;

  @override
  void dispose() {
    _tokenController.dispose();
    _titleController.dispose();
    _bodyController.dispose();
    _imageUrlController.dispose();
    _dataController.dispose();
    super.dispose();
  }

  Future<void> _loadToken() async {
    final token = await NotificationService.instance.fetchToken();
    if (!mounted) return;
    setState(() {
      _tokenController.text = token ?? '';
    });
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
        imageUrl: imageUrl.isEmpty ? null : imageUrl,
        data: data,
      );

      if (!mounted) return;
      setState(() {
        _sending = false;
        _status = 'Delivered to FCM.';
        _lastResponse = response;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _status = null;
        _error = err.toString();
      });
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
                DropdownButtonFormField<String>(
                  value: _icon,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    labelText: 'Icon',
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'ic_notif_default',
                      child: Text('ic_notif_default'),
                    ),
                    DropdownMenuItem(
                      value: 'ic_notif_sale',
                      child: Text('ic_notif_sale'),
                    ),
                    DropdownMenuItem(
                      value: 'ic_notif_chat',
                      child: Text('ic_notif_chat'),
                    ),
                    DropdownMenuItem(
                      value: 'ic_notif_alert',
                      child: Text('ic_notif_alert'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _icon = value;
                    });
                  },
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
