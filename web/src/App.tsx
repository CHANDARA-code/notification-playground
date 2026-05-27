import { useEffect, useMemo, useState } from 'react';

import {
  activateConfig,
  apiBaseUrl,
  createConfig,
  createTopic,
  deleteConfig,
  deleteTopic,
  listConfigs,
  listTopics,
  sendNotification,
  subscribeTokensToTopic,
  type Topic,
  type TopicSubscriptionResult,
  unsubscribeTokensFromTopic,
  updateConfigById,
} from '@lib/api';

const iconOptions = [
  'ic_notif_default',
  'ic_notif_sale',
  'ic_notif_chat',
  'ic_notif_alert',
];

const presetData = {
  screen: 'promo',
  campaign: 'spring_launch',
};

type ConfigPriority = 'high' | 'normal';

type PushConfig = {
  id?: number;
  name?: string;
  topic?: string | null;
  topics?: string[] | null;
  priority?: ConfigPriority;
  androidPriority?: ConfigPriority;
  apnsPriority?: ConfigPriority;
  isActive?: number;
};

export default function App() {
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('Sale now live');
  const [body, setBody] = useState('Tap to view the deal');
  const [icon, setIcon] = useState(iconOptions[0]);
  const [leftIconUrl, setLeftIconUrl] = useState(
    'https://static.vecteezy.com/system/resources/thumbnails/048/942/306/small/dog-face-cartoon-icon-vector.jpg',
  );
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80',
  );
  const [configName, setConfigName] = useState('');
  const [configTopics, setConfigTopics] = useState('');
  const [configAndroidPriority, setConfigAndroidPriority] =
    useState<ConfigPriority>('high');
  const [configApnsPriority, setConfigApnsPriority] =
    useState<ConfigPriority>('high');
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [configs, setConfigs] = useState<PushConfig[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dataJson, setDataJson] = useState(
    JSON.stringify(presetData, null, 2),
  );
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicStatus, setTopicStatus] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const [subscribeTokens, setSubscribeTokens] = useState('');
  const [subscribeResult, setSubscribeResult] = useState<(TopicSubscriptionResult & { action: string }) | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<object | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<'api' | 'firebase' | null>(null);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const parsedData = useMemo(() => {
    if (!dataJson.trim()) return null;
    try {
      return JSON.parse(dataJson);
    } catch {
      return null;
    }
  }, [dataJson]);

  const activeConfig = useMemo(
    () => configs.find((config) => config.isActive === 1),
    [configs],
  );

  const preview = {
    title,
    body,
    icon,
    left_icon_url: leftIconUrl,
    imageUrl,
    data: parsedData ?? {},
  };

  const parseTopics = (value: string) =>
    Array.from(
      new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );

  const loadConfigs = async () => {
    try {
      const list = await listConfigs();
      setConfigs(list);

      if (!editingId) {
        const active = list.find((item) => item.isActive === 1);
        if (active) {
          setConfigName(active.name ?? '');
          const activeTopics =
            active.topics && active.topics.length > 0
              ? active.topics.join(', ')
              : active.topic ?? '';
          setConfigTopics(activeTopics);
          setConfigAndroidPriority(active.androidPriority ?? active.priority ?? 'high');
          setConfigApnsPriority(active.apnsPriority ?? active.priority ?? 'high');
        }
      }
    } catch (err) {
      setConfigStatus(
        err instanceof Error ? err.message : 'Failed to load configs.',
      );
    }
  };

  const loadTopics = async () => {
    try {
      const list = await listTopics();
      setTopics(list);
    } catch (err) {
      setTopicStatus(err instanceof Error ? err.message : 'Failed to load topics.');
    }
  };

  const handleCreateTopic = async () => {
    const name = topicName.trim();
    if (!name) return;
    setTopicStatus(null);
    try {
      await createTopic({ name, description: topicDesc.trim() || null });
      setTopicName('');
      setTopicDesc('');
      await loadTopics();
      setTopicStatus('Topic created.');
    } catch (err) {
      setTopicStatus(err instanceof Error ? err.message : 'Failed to create topic.');
    }
  };

  const handleDeleteTopic = async (id: number, name: string) => {
    setTopicStatus(null);
    try {
      await deleteTopic(id);
      setSelectedTopics((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      await loadTopics();
      setTopicStatus('Topic deleted.');
    } catch (err) {
      setTopicStatus(err instanceof Error ? err.message : 'Failed to delete topic.');
    }
  };

  const handleTopicTokenAction = async (topicName: string, action: 'subscribe' | 'unsubscribe') => {
    const tokens = subscribeTokens
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;
    setSubscribeResult(null);
    try {
      const result =
        action === 'subscribe'
          ? await subscribeTokensToTopic(topicName, tokens)
          : await unsubscribeTokensFromTopic(topicName, tokens);
      setSubscribeResult({ ...result, action });
    } catch (err) {
      setSubscribeResult({
        successCount: 0,
        failureCount: tokens.length,
        errors: [{ index: 0, reason: err instanceof Error ? err.message : String(err) }],
        action,
      });
    }
  };

  const toggleTopicSelection = (name: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  useEffect(() => {
    void loadConfigs();
    void loadTopics();
  }, []);

  const handleSaveConfig = async () => {
    setConfigStatus(null);
    const topics = parseTopics(configTopics);
    const payload = {
      name: configName.trim() ? configName.trim() : 'Untitled',
      topics: topics.length ? topics : null,
      androidPriority: configAndroidPriority,
      apnsPriority: configApnsPriority,
    };

    try {
      if (editingId) {
        await updateConfigById(editingId, payload);
      } else {
        await createConfig(payload);
      }
      setEditingId(null);
      setConfigName('');
      setConfigTopics('');
      setConfigAndroidPriority('high');
      setConfigApnsPriority('high');
      await loadConfigs();
      setConfigStatus('Config saved.');
    } catch (err) {
      setConfigStatus(
        err instanceof Error ? err.message : 'Failed to save config.',
      );
    }
  };

  const handleEditConfig = (config: PushConfig) => {
    setEditingId(config.id ?? null);
    setConfigName(config.name ?? '');
    const topics =
      config.topics && config.topics.length > 0
        ? config.topics.join(', ')
        : config.topic ?? '';
    setConfigTopics(topics);
    setConfigAndroidPriority(config.androidPriority ?? config.priority ?? 'high');
    setConfigApnsPriority(config.apnsPriority ?? config.priority ?? 'high');
  };

  const handleActivate = async (id?: number) => {
    if (!id) return;
    setConfigStatus(null);
    try {
      await activateConfig(id);
      await loadConfigs();
      setConfigStatus('Config activated.');
    } catch (err) {
      setConfigStatus(
        err instanceof Error ? err.message : 'Failed to activate config.',
      );
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    setConfigStatus(null);
    try {
      await deleteConfig(id);
      await loadConfigs();
      setConfigStatus('Config deleted.');
    } catch (err) {
      setConfigStatus(
        err instanceof Error ? err.message : 'Failed to delete config.',
      );
    }
  };

  const buildEffectiveTopics = (): string[] => {
    const manual = [...selectedTopics];
    if (manual.length > 0) return manual;
    return activeConfig?.topics && activeConfig.topics.length > 0
      ? activeConfig.topics
      : activeConfig?.topic
        ? [activeConfig.topic]
        : [];
  };

  const buildOurApiCurl = (): string => {
    const effectiveTopics = buildEffectiveTopics();
    const payload: Record<string, unknown> = { title, body };
    if (token.trim()) payload.token = token.trim();
    if (!token.trim() && effectiveTopics.length > 0) payload.topics = effectiveTopics;
    if (icon) payload.icon = icon;
    if (leftIconUrl.trim()) payload.left_icon_url = leftIconUrl.trim();
    if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();
    if (dataJson.trim()) {
      try { payload.data = JSON.parse(dataJson); } catch { /* invalid json, skip */ }
    }
    const json = JSON.stringify(payload, null, 2);
    return `curl -X POST ${apiBaseUrl}/notifications/send \\\n  -H "Content-Type: application/json" \\\n  -d '${json}'`;
  };

  const buildFirebaseCurl = (): string => {
    const effectiveTopics = buildEffectiveTopics();
    const data: Record<string, string> = { title, body };
    if (icon) data.icon = icon;
    if (leftIconUrl.trim()) data.left_icon_url = leftIconUrl.trim();
    if (imageUrl.trim()) data.imageUrl = imageUrl.trim();
    if (dataJson.trim()) {
      try {
        const parsed = JSON.parse(dataJson) as Record<string, unknown>;
        for (const [k, v] of Object.entries(parsed)) data[k] = String(v);
      } catch { /* invalid json, skip */ }
    }

    let target: Record<string, string>;
    if (token.trim()) {
      target = { token: token.trim() };
    } else if (effectiveTopics.length === 1) {
      target = { topic: effectiveTopics[0] };
    } else if (effectiveTopics.length > 1) {
      target = { condition: effectiveTopics.map((t) => `'${t}' in topics`).join(' || ') };
    } else {
      target = { token: 'YOUR_DEVICE_FCM_TOKEN' };
    }

    const payload = {
      message: {
        ...target,
        data,
        android: { priority: 'high' },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { 'content-available': 1 } },
        },
      },
    };

    const json = JSON.stringify(payload, null, 2);
    return `curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \\\n  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${json}'`;
  };

  const handleCopyCurl = (which: 'api' | 'firebase') => {
    const text = which === 'api' ? buildOurApiCurl() : buildFirebaseCurl();
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedCurl(which);
      setTimeout(() => setCopiedCurl(null), 2000);
    });
  };

  const handleSend = async () => {
    setError(null);
    setStatus('Sending...');

    const manualTopics = [...selectedTopics];
    const activeTopics =
      activeConfig?.topics && activeConfig.topics.length > 0
        ? activeConfig.topics
        : activeConfig?.topic
          ? [activeConfig.topic]
          : [];
    const effectiveTopics = manualTopics.length > 0 ? manualTopics : activeTopics;

    if (!token.trim() && effectiveTopics.length === 0) {
      setError('FCM token or a selected topic is required.');
      setStatus(null);
      return;
    }

    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      setStatus(null);
      return;
    }

    let data: Record<string, string | number | boolean> | undefined;
    if (dataJson.trim()) {
      try {
        data = JSON.parse(dataJson);
      } catch {
        setError('Custom data must be valid JSON.');
        setStatus(null);
        return;
      }
    }

    try {
      const response = await sendNotification({
        token: token.trim() ? token : undefined,
        topics: !token.trim() && effectiveTopics.length > 0 ? effectiveTopics : undefined,
        title,
        body,
        icon,
        left_icon_url: leftIconUrl.trim() ? leftIconUrl : undefined,
        imageUrl: imageUrl.trim() ? imageUrl : undefined,
        data,
      });
      setLastResponse(response);
      setStatus('Delivered to FCM.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
      setStatus(null);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 text-tx-base md:px-12">
      <header className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-tx-muted">
            Push Playground
          </p>
          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-bd bg-surface transition hover:bg-surface-2"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-tx-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-tx-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-tx-base md:text-5xl">
          Dynamic Icon Notification Studio
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-tx-muted md:text-base">
          Craft data-only FCM payloads with custom Android icons. The server will
          hand it off to Firebase Admin, and your Flutter app renders the
          notification.
        </p>
      </header>

      <main className="mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-[70%_30%]">
        <section className="glass rounded-3xl p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-tx-base">Payload</h2>
            <span className="text-xs text-tx-muted">API: {apiBaseUrl}</span>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="rounded-2xl border border-bd bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-tx-muted">
                Config manager
              </p>
              <div className="mt-4 grid gap-4">
                <Field label="Name" hint="Config label">
                  <input
                    title="Config name"
                    value={configName}
                    onChange={(event) => setConfigName(event.target.value)}
                    className="w-full rounded-xl border border-bd bg-surface-2 px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Topics" hint="Comma separated (e.g. ahaha, test, ios, android, all)">
                    <input
                      title="Topics"
                      value={configTopics}
                      onChange={(event) => setConfigTopics(event.target.value)}
                      className="w-full rounded-xl border border-bd bg-surface-2 px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                    />
                  </Field>
                  <Field label="Android priority" hint="FCM Android priority">
                    <select
                      title="Android priority"
                      value={configAndroidPriority}
                      onChange={(event) =>
                        setConfigAndroidPriority(
                          event.target.value as ConfigPriority,
                        )
                      }
                      className="w-full rounded-xl border border-bd bg-surface-2 px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                    >
                      <option value="high">high</option>
                      <option value="normal">normal</option>
                    </select>
                  </Field>
                  <Field label="iOS priority" hint="APNs priority">
                    <select
                      title="iOS priority"
                      value={configApnsPriority}
                      onChange={(event) =>
                        setConfigApnsPriority(
                          event.target.value as ConfigPriority,
                        )
                      }
                      className="w-full rounded-xl border border-bd bg-surface-2 px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                    >
                      <option value="high">high</option>
                      <option value="normal">normal</option>
                    </select>
                  </Field>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="inline-flex items-center justify-center rounded-xl bg-surface-2 px-4 py-2 text-xs font-semibold text-tx-base transition hover:bg-surface-hover"
                >
                  {editingId ? 'Update config' : 'Create config'}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setConfigName('');
                      setConfigTopics('');
                      setConfigAndroidPriority('high');
                      setConfigApnsPriority('high');
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-bd px-4 py-2 text-xs font-semibold text-tx-base transition hover:border-bd-strong"
                  >
                    Cancel
                  </button>
                ) : null}
                {configStatus ? (
                  <span className="text-xs text-tx-muted">{configStatus}</span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3">
                {configs.length === 0 ? (
                  <span className="text-xs text-tx-muted">
                    No configs yet.
                  </span>
                ) : (
                  configs.map((config) => (
                    <div
                      key={config.id}
                      className="rounded-2xl border border-bd bg-surface-2 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-tx-base">
                          {config.name ?? 'Untitled'}
                        </p>
                        <p className="text-xs text-tx-muted">
                          Topics:{' '}
                          {config.topics && config.topics.length > 0
                            ? config.topics.join(', ')
                            : config.topic || '—'}{' '}
                          • Android:{' '}
                          {config.androidPriority ??
                            config.priority ??
                            'high'}{' '}
                          • iOS:{' '}
                          {config.apnsPriority ?? config.priority ?? 'high'}
                        </p>
                      </div>
                        {config.isActive === 1 ? (
                          <span className="rounded-full bg-accent-500/20 px-3 py-1 text-xs text-accent-400">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditConfig(config)}
                          className="rounded-xl border border-bd px-3 py-1 text-xs text-tx-base transition hover:border-bd-strong"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActivate(config.id)}
                          className="rounded-xl border border-bd px-3 py-1 text-xs text-tx-base transition hover:border-bd-strong"
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(config.id)}
                          className="rounded-xl border border-red-500/50 px-3 py-1 text-xs text-red-300 transition hover:border-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-bd bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-tx-muted">
                  Topic Catalog
                </p>
                <button
                  type="button"
                  onClick={() => void loadTopics()}
                  className="text-xs text-tx-muted transition hover:text-tx-base"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateTopic(); }}
                  placeholder="Topic name *"
                  className="rounded-xl border border-bd bg-surface-2 px-4 py-2 text-sm text-tx-base outline-none focus:border-accent-400"
                />
                <input
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateTopic(); }}
                  placeholder="Description (optional)"
                  className="rounded-xl border border-bd bg-surface-2 px-4 py-2 text-sm text-tx-base outline-none focus:border-accent-400"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateTopic()}
                  disabled={!topicName.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-surface-2 px-4 py-2 text-xs font-semibold text-tx-base transition hover:bg-surface-hover disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {topicStatus ? (
                <p className="mt-2 text-xs text-tx-muted">{topicStatus}</p>
              ) : null}

              <div className="mt-4 grid gap-2">
                {topics.length === 0 ? (
                  <span className="text-xs text-tx-muted">No topics yet.</span>
                ) : (
                  topics.map((topic) => (
                    <div key={topic.id} className="rounded-xl border border-bd bg-surface-2">
                      <div className="flex items-center gap-3 px-4 py-2">
                        <input
                          type="checkbox"
                          id={`topic-${topic.id}`}
                          checked={selectedTopics.has(topic.name)}
                          onChange={() => toggleTopicSelection(topic.name)}
                          className="h-4 w-4 cursor-pointer accent-accent-400"
                          title={`Select ${topic.name} for broadcast`}
                        />
                        <label
                          htmlFor={`topic-${topic.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-tx-base">
                            {topic.name}
                          </span>
                          {topic.description ? (
                            <span className="ml-2 text-xs text-tx-muted">
                              {topic.description}
                            </span>
                          ) : null}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedTopic(expandedTopic === topic.id ? null : topic.id);
                            setSubscribeTokens('');
                            setSubscribeResult(null);
                          }}
                          className="rounded-lg border border-bd px-2 py-1 text-xs text-tx-muted transition hover:border-bd-strong hover:text-tx-base"
                        >
                          {expandedTopic === topic.id ? 'Close' : 'Manage'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteTopic(topic.id, topic.name)}
                          className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 transition hover:border-red-400"
                        >
                          Delete
                        </button>
                      </div>

                      {expandedTopic === topic.id ? (
                        <div className="border-t border-bd px-4 py-3">
                          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-tx-muted">
                            Subscribe / unsubscribe FCM tokens
                          </p>
                          <textarea
                            title="FCM tokens (one per line)"
                            placeholder="Paste FCM tokens — one per line"
                            value={subscribeTokens}
                            onChange={(e) => {
                              setSubscribeTokens(e.target.value);
                              setSubscribeResult(null);
                            }}
                            rows={4}
                            className="w-full rounded-xl border border-bd bg-surface px-3 py-2 text-xs text-tx-base outline-none focus:border-accent-400"
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!subscribeTokens.trim()}
                              onClick={() => void handleTopicTokenAction(topic.name, 'subscribe')}
                              className="rounded-xl bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-400 disabled:opacity-40"
                            >
                              Subscribe
                            </button>
                            <button
                              type="button"
                              disabled={!subscribeTokens.trim()}
                              onClick={() => void handleTopicTokenAction(topic.name, 'unsubscribe')}
                              className="rounded-xl border border-bd px-3 py-1.5 text-xs font-semibold text-tx-base transition hover:border-bd-strong disabled:opacity-40"
                            >
                              Unsubscribe
                            </button>
                          </div>
                          {subscribeResult ? (
                            <div className="mt-2 rounded-xl border border-bd bg-surface px-3 py-2 text-xs">
                              <span className={subscribeResult.failureCount === 0 ? 'text-green-400' : 'text-yellow-400'}>
                                {subscribeResult.action === 'subscribe' ? 'Subscribed' : 'Unsubscribed'}{' '}
                                {subscribeResult.successCount} token(s)
                                {subscribeResult.failureCount > 0
                                  ? `, ${subscribeResult.failureCount} failed`
                                  : ''}
                              </span>
                              {subscribeResult.errors.length > 0 ? (
                                <ul className="mt-1 list-disc pl-4 text-red-300">
                                  {subscribeResult.errors.map((e) => (
                                    <li key={e.index}>token[{e.index}]: {e.reason}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              {selectedTopics.size > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-tx-muted">Send to:</span>
                  {[...selectedTopics].map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-accent-500/20 px-3 py-0.5 text-xs text-accent-400"
                    >
                      {name}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedTopics(new Set())}
                    className="text-xs text-tx-muted transition hover:text-tx-base"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            <Field label="FCM token">
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                rows={2}
                placeholder="Optional if topics are selected or an active config is set"
                className="w-full rounded-xl border border-bd bg-surface px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" required>
                <input
                  title="Notification title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-bd bg-surface px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                />
              </Field>
              <Field label="Body" required>
                <input
                  title="Notification body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="w-full rounded-xl border border-bd bg-surface px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Small icon" hint="Must be a bundled drawable">
                <select
                  title="Small icon"
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  className="w-full rounded-xl border border-bd bg-surface px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                >
                  {iconOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Left icon URL" hint="Large icon image (URL)">
                <input
                  title="Left icon URL"
                  value={leftIconUrl}
                  onChange={(event) => setLeftIconUrl(event.target.value)}
                  className="w-full rounded-xl border border-bd bg-surface px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
                />
              </Field>
            </div>
            <Field label="Image URL" hint="Optional big picture">
              <input
                title="Image URL"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="w-full rounded-xl border border-bd bg-surface px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
              />
            </Field>

            <Field label="Custom data (JSON)">
              <textarea
                title="Custom data JSON"
                value={dataJson}
                onChange={(event) => setDataJson(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-bd bg-surface px-4 py-3 text-sm text-tx-base outline-none focus:border-accent-400"
              />
            </Field>

            {error ? (
              <div className="rounded-xl border border-accent-600/60 bg-accent-600/10 px-4 py-3 text-sm text-accent-400">
                {error}
              </div>
            ) : null}
            {status ? (
              <div className="rounded-xl border border-bd bg-surface-2 px-4 py-3 text-sm text-tx-base">
                {status}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleCopyCurl('api')}
                className="inline-flex items-center gap-2 rounded-xl border border-bd bg-surface px-4 py-2.5 text-xs font-semibold text-tx-base transition hover:border-bd-strong hover:text-tx-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copiedCurl === 'api' ? 'Copied!' : 'Copy cURL — Our API'}
              </button>
              <button
                type="button"
                onClick={() => handleCopyCurl('firebase')}
                className="inline-flex items-center gap-2 rounded-xl border border-bd bg-surface px-4 py-2.5 text-xs font-semibold text-tx-base transition hover:border-bd-strong hover:text-tx-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copiedCurl === 'firebase' ? 'Copied!' : 'Copy cURL — Firebase Admin'}
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center justify-center rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-400"
              >
                Send test push
              </button>
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-tx-base">Preview</h2>
          <div className="mt-5 rounded-2xl border border-bd bg-surface p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/20 text-sm font-semibold text-accent-400">
                {icon.replace('ic_notif_', '').slice(0, 4).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-tx-base">{title}</p>
                <p className="mt-1 text-sm text-tx-muted">{body}</p>
                {imageUrl ? (
                  <p className="mt-3 text-xs text-tx-muted">{imageUrl}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-tx-muted">
              Data payload
            </p>
            <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-surface p-4 text-xs text-tx-base">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-tx-muted">
              Last response
            </p>
            <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-surface p-4 text-xs text-tx-base">
              {lastResponse ? JSON.stringify(lastResponse, null, 2) : '—'}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm text-tx-muted">
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-tx-muted">
        {label}
        {required ? <span className="text-accent-400">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-tx-muted">{hint}</span> : null}
    </label>
  );
}
