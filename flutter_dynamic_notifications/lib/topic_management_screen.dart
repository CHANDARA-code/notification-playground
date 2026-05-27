import 'package:flutter/material.dart';

import 'notification_service.dart';

class TopicManagementScreen extends StatefulWidget {
  const TopicManagementScreen({
    super.key,
    required this.apiBaseUrl,
    required this.deviceToken,
  });

  final String apiBaseUrl;
  final String deviceToken;

  @override
  State<TopicManagementScreen> createState() => _TopicManagementScreenState();
}

class _TopicManagementScreenState extends State<TopicManagementScreen> {
  final _searchController = TextEditingController();

  List<Map<String, dynamic>> _available = [];
  Set<String> _subscribed = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;

  String get _query => _searchController.text.trim();

  List<Map<String, dynamic>> get _filtered {
    if (_query.isEmpty) return _available;
    final q = _query.toLowerCase();
    return _available
        .where((t) => (t['name'] ?? '').toString().toLowerCase().contains(q))
        .toList();
  }

  bool get _canCreate {
    if (_query.isEmpty) return false;
    return !_available.any(
      (t) => (t['name'] ?? '').toString().toLowerCase() == _query.toLowerCase(),
    );
  }

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        NotificationService.instance.fetchAvailableTopics(widget.apiBaseUrl),
        NotificationService.instance
            .fetchDeviceTopics(widget.apiBaseUrl, widget.deviceToken),
      ]);
      setState(() {
        _available = results[0];
        _subscribed = results[1]
            .map((t) => t['name']?.toString() ?? '')
            .where((n) => n.isNotEmpty)
            .toSet();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _toggle(String topicName, bool subscribe) async {
    if (_saving) return;
    final next = Set<String>.from(_subscribed);
    subscribe ? next.add(topicName) : next.remove(topicName);
    setState(() {
      _subscribed = next;
      _saving = true;
    });
    try {
      await NotificationService.instance.syncDeviceTopics(
        widget.apiBaseUrl,
        token: widget.deviceToken,
        topicNames: next.toList(),
      );
    } catch (e) {
      setState(() {
        subscribe ? _subscribed.remove(topicName) : _subscribed.add(topicName);
      });
      _showError('Failed: $e');
    } finally {
      setState(() => _saving = false);
    }
  }

  Future<void> _openCreateSheet() async {
    final result = await showModalBottomSheet<_CreateResult>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _CreateTopicSheet(initialName: _query),
    );
    if (result == null || !mounted) return;

    setState(() => _saving = true);
    try {
      final created = await NotificationService.instance.createTopicOnServer(
        widget.apiBaseUrl,
        name: result.name,
        description: result.description,
      );
      setState(() {
        _available = [..._available, created]
          ..sort((a, b) => (a['name'] ?? '').toString()
              .compareTo((b['name'] ?? '').toString()));
      });
      if (result.subscribe) {
        await _toggle(result.name, true);
      }
      _searchController.clear();
    } catch (e) {
      _showError('Create failed: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Topic Subscriptions'),
        actions: [
          if (_saving) ...[
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 16),
          ],
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading || _saving ? null : _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorView(error: _error!, onRetry: _load)
              : Column(
                  children: [
                    _SearchBar(controller: _searchController),
                    Expanded(child: _buildList()),
                  ],
                ),
    );
  }

  Widget _buildList() {
    final items = _filtered;

    if (items.isEmpty && !_canCreate) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.topic_outlined, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(
                _query.isEmpty
                    ? 'No topics yet.\nType a name below to create one.'
                    : 'No topics match "$_query".',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: items.length + (_canCreate ? 1 : 0),
      separatorBuilder: (_, i) {
        // divider before "create" row
        if (_canCreate && i == items.length - 1) return const Divider(height: 1);
        return const Divider(height: 1);
      },
      itemBuilder: (context, index) {
        if (_canCreate && index == items.length) {
          return _CreateRow(
            name: _query,
            onTap: _saving ? null : _openCreateSheet,
          );
        }
        final topic = items[index];
        final name = topic['name']?.toString() ?? '';
        final description = topic['description']?.toString();
        return SwitchListTile(
          title: Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
          subtitle: (description != null && description.isNotEmpty)
              ? Text(description)
              : null,
          value: _subscribed.contains(name),
          onChanged: _saving ? null : (v) => _toggle(name, v),
        );
      },
    );
  }
}

// ── Subwidgets ────────────────────────────────────────────────────────────────

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: TextField(
        controller: controller,
        autofocus: false,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Search or create topic…',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: controller.clear,
                )
              : null,
          border: const OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
        ),
      ),
    );
  }
}

class _CreateRow extends StatelessWidget {
  const _CreateRow({required this.name, required this.onTap});
  final String name;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return ListTile(
      leading: Icon(Icons.add_circle_outline, color: color),
      title: RichText(
        text: TextSpan(
          style: Theme.of(context).textTheme.bodyLarge,
          children: [
            const TextSpan(text: 'Create '),
            TextSpan(
              text: '"$name"',
              style: TextStyle(fontWeight: FontWeight.bold, color: color),
            ),
          ],
        ),
      ),
      subtitle: const Text('Tap to create and subscribe'),
      onTap: onTap,
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error, required this.onRetry});
  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

// ── Create topic bottom sheet ─────────────────────────────────────────────────

class _CreateResult {
  const _CreateResult({
    required this.name,
    required this.description,
    required this.subscribe,
  });
  final String name;
  final String? description;
  final bool subscribe;
}

class _CreateTopicSheet extends StatefulWidget {
  const _CreateTopicSheet({required this.initialName});
  final String initialName;

  @override
  State<_CreateTopicSheet> createState() => _CreateTopicSheetState();
}

class _CreateTopicSheetState extends State<_CreateTopicSheet> {
  late final TextEditingController _nameCtrl;
  final _descCtrl = TextEditingController();
  bool _subscribe = true;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.initialName);
    _nameCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    Navigator.pop(
      context,
      _CreateResult(
        name: name,
        description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        subscribe: _subscribe,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final insets = MediaQuery.of(context).viewInsets;
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + insets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'New Topic',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _nameCtrl,
            autofocus: true,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Topic name *',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descCtrl,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
            decoration: const InputDecoration(
              labelText: 'Description (optional)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 4),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Subscribe after creating'),
            value: _subscribe,
            onChanged: (v) => setState(() => _subscribe = v),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _nameCtrl.text.trim().isEmpty ? null : _submit,
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}
