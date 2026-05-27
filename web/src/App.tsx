import { useEffect, useMemo, useRef, useState } from 'react';

import {
  activateConfig,
  createConfig,
  createTopic,
  deleteConfig,
  deleteTopic,
  getApiBaseUrl,
  getNotificationHistory,
  listConfigs,
  listTopics,
  type NotificationHistoryItem,
  resetApiBaseUrl,
  sendNotification,
  setApiBaseUrl,
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
  const [hoveredCurl, setHoveredCurl] = useState<'api' | 'firebase' | null>(null);
  const curlDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [simPlatform, setSimPlatform] = useState<'android' | 'ios'>('android');

  const HIST_PAGE_SIZE = 10;
  const [histItems, setHistItems] = useState<NotificationHistoryItem[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage] = useState(1);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark'),
  );
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [apiUrlEditing, setApiUrlEditing] = useState(false);
  const [apiUrlDraft, setApiUrlDraft] = useState('');

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
    void loadHistory(1);
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

  const loadHistory = async (page: number) => {
    setHistLoading(true);
    setHistError(null);
    try {
      const res = await getNotificationHistory(page, HIST_PAGE_SIZE);
      setHistItems(res.items);
      setHistTotal(res.total);
      setHistPage(page);
    } catch (err) {
      setHistError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setHistLoading(false);
    }
  };

  const handleDuplicate = (item: NotificationHistoryItem) => {
    setToken(item.token ?? '');
    setTitle(item.title);
    setBody(item.body);
    setIcon(iconOptions.includes(item.icon ?? '') ? (item.icon as string) : iconOptions[0]);
    setLeftIconUrl(item.leftIconUrl ?? item.iconUrl ?? '');
    setImageUrl(item.imageUrl ?? '');

    if (item.data) {
      try {
        setDataJson(JSON.stringify(JSON.parse(item.data), null, 2));
      } catch {
        setDataJson('{}');
      }
    } else {
      setDataJson('{}');
    }

    try {
      const topicList: string[] = item.topics ? JSON.parse(item.topics) : [];
      setSelectedTopics(new Set(topicList.length ? topicList : item.topic ? [item.topic] : []));
    } catch {
      setSelectedTopics(item.topic ? new Set([item.topic]) : new Set());
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStatus('Loaded from history — edit and resend.');
    setError(null);
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
    return `curl -X POST ${apiUrl}/notifications/send \\\n  -H "Content-Type: application/json" \\\n  -d '${json}'`;
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

  const openCurlPreview = (which: 'api' | 'firebase') => {
    if (curlDismissTimer.current) clearTimeout(curlDismissTimer.current);
    setHoveredCurl(which);
  };

  const scheduleCurlDismiss = () => {
    curlDismissTimer.current = setTimeout(() => setHoveredCurl(null), 180);
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
    <div className="min-h-screen py-10 text-tx-base">
      <header>
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
          Notification Studio
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-tx-muted md:text-base">
          Craft data-only FCM payloads with custom Android icons. The server will
          hand it off to Firebase Admin, and your Flutter app renders the
          notification.
        </p>
      </header>

      <main className="mt-10 grid gap-8 lg:grid-cols-[54fr_46fr]">
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-tx-base">Payload</h2>
            {apiUrlEditing ? (
              <form
                className="flex min-w-0 flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = apiUrlDraft.trim();
                  setApiBaseUrl(val);
                  setApiUrl(getApiBaseUrl());
                  setApiUrlEditing(false);
                }}
              >
                <input
                  title="API base URL"
                  autoFocus
                  value={apiUrlDraft}
                  onChange={(e) => setApiUrlDraft(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="min-w-0 flex-1 rounded-lg border border-bd bg-surface-2 px-3 py-1 text-xs text-tx-base outline-none focus:border-accent-400"
                />
                <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-bd px-2.5 py-1 text-xs text-tx-base transition hover:border-bd-strong">
                  Save <Ic name="check" />
                </button>
                <button
                  type="button"
                  onClick={() => setApiUrlEditing(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-bd px-2.5 py-1 text-xs text-tx-muted transition hover:border-bd-strong"
                >
                  Cancel <Ic name="x" />
                </button>
                {localStorage.getItem('apiBaseUrl') ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetApiBaseUrl();
                      setApiUrl(getApiBaseUrl());
                      setApiUrlEditing(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition hover:border-red-400"
                  >
                    Reset <Ic name="undo" />
                  </button>
                ) : null}
              </form>
            ) : (
              <button
                type="button"
                title="Click to change API base URL"
                onClick={() => { setApiUrlDraft(apiUrl); setApiUrlEditing(true); }}
                className="flex items-center gap-1.5 rounded-lg border border-bd px-2.5 py-1 text-xs text-tx-muted transition hover:border-bd-strong hover:text-tx-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {apiUrl}
              </button>
            )}
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
                  className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-surface-2 px-4 py-2 text-xs font-semibold text-tx-base transition hover:bg-surface-hover"
                >
                  {editingId ? 'Update config' : 'Create config'} <Ic name="check" />
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
                    className="inline-flex items-center gap-1.5 justify-center rounded-xl border border-bd px-4 py-2 text-xs font-semibold text-tx-base transition hover:border-bd-strong"
                  >
                    Cancel <Ic name="x" />
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-bd px-3 py-1 text-xs text-tx-base transition hover:border-bd-strong"
                        >
                          Edit <Ic name="pencil" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActivate(config.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-bd px-3 py-1 text-xs text-tx-base transition hover:border-bd-strong"
                        >
                          Activate <Ic name="bolt" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(config.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/50 px-3 py-1 text-xs text-red-300 transition hover:border-red-400"
                        >
                          Delete <Ic name="trash" />
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
                  className="inline-flex items-center gap-1 text-xs text-tx-muted transition hover:text-tx-base"
                >
                  Refresh <Ic name="refresh" />
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
                  className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-surface-2 px-4 py-2 text-xs font-semibold text-tx-base transition hover:bg-surface-hover disabled:opacity-40"
                >
                  Add <Ic name="plus" />
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
                          className="inline-flex items-center gap-1 rounded-lg border border-bd px-2 py-1 text-xs text-tx-muted transition hover:border-bd-strong hover:text-tx-base"
                        >
                          {expandedTopic === topic.id ? 'Close' : 'Manage'}
                          <Ic name={expandedTopic === topic.id ? 'x' : 'sliders'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteTopic(topic.id, topic.name)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 transition hover:border-red-400"
                        >
                          Delete <Ic name="trash" />
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
                              className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-400 disabled:opacity-40"
                            >
                              Subscribe <Ic name="link" />
                            </button>
                            <button
                              type="button"
                              disabled={!subscribeTokens.trim()}
                              onClick={() => void handleTopicTokenAction(topic.name, 'unsubscribe')}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-bd px-3 py-1.5 text-xs font-semibold text-tx-base transition hover:border-bd-strong disabled:opacity-40"
                            >
                              Unsubscribe <Ic name="unlink" />
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
                    className="inline-flex items-center gap-1 text-xs text-tx-muted transition hover:text-tx-base"
                  >
                    Clear <Ic name="x" />
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
              {/* Copy cURL — Our API */}
              <div
                className="relative"
                onMouseEnter={() => openCurlPreview('api')}
                onMouseLeave={scheduleCurlDismiss}
              >
                {hoveredCurl === 'api' && (
                  <div
                    className="absolute bottom-full left-0 z-50 mb-1 w-[520px] max-w-[calc(100vw-2rem)] rounded-xl border border-bd bg-surface-3 p-3"
                    onMouseEnter={() => openCurlPreview('api')}
                    onMouseLeave={scheduleCurlDismiss}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-tx-muted">Our API</p>
                      <button
                        type="button"
                        title="Close preview"
                        onClick={() => setHoveredCurl(null)}
                        className="flex h-5 w-5 items-center justify-center rounded-lg text-tx-muted transition hover:bg-surface-hover hover:text-tx-base"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <pre className="max-h-[200px] overflow-auto whitespace-pre font-mono text-[10px] leading-relaxed text-tx-base">
                      {buildOurApiCurl()}
                    </pre>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyCurl('api')}
                  className="inline-flex items-center gap-2 rounded-xl border border-bd bg-surface px-4 py-2.5 text-xs font-semibold text-tx-base transition hover:border-bd-strong"
                >
                  {copiedCurl === 'api' ? 'Copied!' : 'Copy cURL — Our API'}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              {/* Copy cURL — Firebase Admin */}
              <div
                className="relative"
                onMouseEnter={() => openCurlPreview('firebase')}
                onMouseLeave={scheduleCurlDismiss}
              >
                {hoveredCurl === 'firebase' && (
                  <div
                    className="absolute bottom-full left-0 z-50 mb-1 w-[520px] max-w-[calc(100vw-2rem)] rounded-xl border border-bd bg-surface-3 p-3"
                    onMouseEnter={() => openCurlPreview('firebase')}
                    onMouseLeave={scheduleCurlDismiss}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-tx-muted">Firebase Admin</p>
                      <button
                        type="button"
                        title="Close preview"
                        onClick={() => setHoveredCurl(null)}
                        className="flex h-5 w-5 items-center justify-center rounded-lg text-tx-muted transition hover:bg-surface-hover hover:text-tx-base"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <pre className="max-h-[200px] overflow-auto whitespace-pre font-mono text-[10px] leading-relaxed text-tx-base">
                      {buildFirebaseCurl()}
                    </pre>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleCopyCurl('firebase')}
                  className="inline-flex items-center gap-2 rounded-xl border border-bd bg-surface px-4 py-2.5 text-xs font-semibold text-tx-base transition hover:border-bd-strong"
                >
                  {copiedCurl === 'firebase' ? 'Copied!' : 'Copy cURL — Firebase Admin'}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 justify-center rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-400"
              >
                Send test push <Ic name="send" />
              </button>
            </div>
          </div>
        </section>

        <section className="glass overflow-hidden rounded-3xl p-6">
          {/* Platform tab switcher */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-tx-base">Simulator</h2>
            <div className="flex rounded-xl border border-bd bg-surface-2 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSimPlatform('android')}
                className={`rounded-lg px-3 py-1.5 transition ${simPlatform === 'android' ? 'bg-surface text-tx-base' : 'text-tx-muted hover:text-tx-base'}`}
              >
                S26 Ultra
              </button>
              <button
                type="button"
                onClick={() => setSimPlatform('ios')}
                className={`rounded-lg px-3 py-1.5 transition ${simPlatform === 'ios' ? 'bg-surface text-tx-base' : 'text-tx-muted hover:text-tx-base'}`}
              >
                iPhone 17 Pro
              </button>
            </div>
          </div>

          <div className="mt-5">
            {simPlatform === 'android' ? (
              <AndroidPhone
                title={title}
                body={body}
                icon={icon}
                leftIconUrl={leftIconUrl}
                imageUrl={imageUrl}
                isDark={isDark}
              />
            ) : (
              <IOSPhone
                title={title}
                body={body}
                icon={icon}
                leftIconUrl={leftIconUrl}
                imageUrl={imageUrl}
                isDark={isDark}
              />
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-tx-muted">
              Last response
            </p>
            <pre className="mt-3 max-h-40 overflow-auto rounded-2xl bg-surface p-4 text-xs text-tx-base">
              {lastResponse ? JSON.stringify(lastResponse, null, 2) : '—'}
            </pre>
          </div>
        </section>
      </main>

      {/* ── Notification History ─────────────────────────────────────────── */}
      <section className="mt-8 pb-16">
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-tx-base">Notification History</h2>
              {histTotal > 0 ? (
                <p className="mt-0.5 text-xs text-tx-muted">{histTotal} total</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void loadHistory(histPage)}
              disabled={histLoading}
              className="inline-flex items-center gap-1 text-xs text-tx-muted transition hover:text-tx-base disabled:opacity-40"
            >
              Refresh <Ic name="refresh" />
            </button>
          </div>

          {histLoading ? (
            <p className="mt-6 text-center text-sm text-tx-muted">Loading…</p>
          ) : histError ? (
            <p className="mt-6 text-center text-sm text-red-400">{histError}</p>
          ) : histItems.length === 0 ? (
            <p className="mt-6 text-center text-sm text-tx-muted">No notifications sent yet.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {histItems.map((item) => (
                <HistoryCard key={item.id} item={item} onDuplicate={handleDuplicate} />
              ))}
            </div>
          )}

          {histTotal > HIST_PAGE_SIZE ? (
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                disabled={histPage <= 1 || histLoading}
                onClick={() => void loadHistory(histPage - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-bd px-4 py-2 text-xs font-semibold text-tx-base transition hover:border-bd-strong disabled:opacity-40"
              >
                <Ic name="arrow-left" /> Prev
              </button>
              <span className="text-xs text-tx-muted">
                Page {histPage} of {Math.ceil(histTotal / HIST_PAGE_SIZE)}
              </span>
              <button
                type="button"
                disabled={histPage >= Math.ceil(histTotal / HIST_PAGE_SIZE) || histLoading}
                onClick={() => void loadHistory(histPage + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-bd px-4 py-2 text-xs font-semibold text-tx-base transition hover:border-bd-strong disabled:opacity-40"
              >
                Next <Ic name="arrow-right" />
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Ic({ name }: { name: string }) {
  const paths: Record<string, string> = {
    check: 'M4.5 12.75l6 6 9-13.5',
    x: 'M6 18L18 6M6 6l12 12',
    pencil: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z',
    bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
    trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
    refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
    plus: 'M12 4.5v15m7.5-7.5h-15',
    sliders: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75',
    link: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
    unlink: 'M13.181 8.68a4.503 4.503 0 011.903 6.405m-9.768-3.22a4.503 4.503 0 006.087 1.416M6.831 8.302a4.5 4.5 0 00-1.457 7.152l4.5 4.5a4.5 4.5 0 006.364-6.364l-1.758-1.757M8.25 15.75l6-6',
    send: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
    copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
    undo: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
    'arrow-left': 'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
    'arrow-right': 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3',
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] ?? ''} />
    </svg>
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

// ── Notification History Card ─────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function HistoryCard({
  item,
  onDuplicate,
}: {
  item: NotificationHistoryItem;
  onDuplicate: (item: NotificationHistoryItem) => void;
}) {
  const isSent = item.status === 'sent';

  let target = '';
  if (item.topics) {
    try {
      const list: string[] = JSON.parse(item.topics);
      target = list.join(', ');
    } catch {
      target = item.topics;
    }
  } else if (item.topic) {
    target = item.topic;
  } else if (item.token) {
    target = `${item.token.slice(0, 24)}…`;
  }

  return (
    <div className="rounded-2xl border border-bd bg-surface-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isSent ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
          }`}
        >
          {item.status}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-tx-base">{item.title}</p>
          <p className="mt-0.5 truncate text-xs text-tx-muted">{item.body}</p>
          {target ? (
            <p className="mt-1 truncate text-[10px] text-tx-muted">→ {target}</p>
          ) : null}
          {item.error ? (
            <p className="mt-1 truncate text-[10px] text-red-400">{item.error}</p>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <span className="text-[10px] text-tx-muted">{formatRelativeTime(item.createdAt)}</span>
          <button
            type="button"
            onClick={() => onDuplicate(item)}
            className="inline-flex items-center gap-1 rounded-lg border border-bd px-2.5 py-1 text-[10px] font-semibold text-tx-base transition hover:border-bd-strong"
          >
            Duplicate <Ic name="copy" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notification Simulators ───────────────────────────────────────────────────

interface PhonePreviewProps {
  title: string;
  body: string;
  icon: string;
  leftIconUrl: string;
  imageUrl: string;
  isDark: boolean;
}

function AndroidPhone({ title, body, icon, leftIconUrl, imageUrl, isDark }: PhonePreviewProps) {
  const iconLabel = icon.replace('ic_notif_', '').slice(0, 3).toUpperCase();

  // Screen palette switches with mode
  const statusBg   = isDark ? '#000000' : '#f5f5f5';
  const timeColor  = isDark ? 'rgba(255,255,255,0.9)' : '#1c1c1e';
  const iconFill   = isDark ? 'white' : '#1c1c1e';
  const shadeBg    = isDark ? '#0d0d0d' : '#ebebeb';
  const cardBg     = isDark ? '#1c1c1e' : '#ffffff';
  const cardRing   = isDark ? 'ring-white/8' : 'ring-black/8';
  const appName    = isDark ? '#adadad' : '#636366';
  const timestamp  = isDark ? '#5a5a5a' : '#8e8e93';
  const closeBtn   = isDark ? '#4a4a4a' : '#aeaeb2';
  const titleColor = isDark ? '#ffffff' : '#1c1c1e';
  const bodyColor  = isDark ? '#8e8e8e' : '#636366';
  const swipeHint  = isDark ? '#3a3a3a' : '#b0b0b0';
  const gestureBar = isDark ? 'bg-white/20' : 'bg-black/15';
  const gestureBg  = isDark ? '#000000' : '#f5f5f5';

  return (
    <div className="sim-phone-frame mx-auto">
      {/* Samsung Galaxy S26 Ultra — titanium flat frame, squared corners */}
      <div className="relative rounded-[1.9rem] bg-[#1c1c1e] p-[6px] ring-1 ring-white/10">
        {/* Titanium frame inner edge highlight */}
        <div className="pointer-events-none absolute inset-[3px] rounded-[1.5rem] ring-[0.5px] ring-white/8" />

        {/* Left — volume down (single long key), volume up */}
        <div className="absolute -left-[3.5px] top-[88px] h-8 w-[3.5px] rounded-l-[2px] bg-[#333]" />
        <div className="absolute -left-[3.5px] top-[124px] h-[46px] w-[3.5px] rounded-l-[2px] bg-[#333]" />
        <div className="absolute -left-[3.5px] top-[178px] h-[46px] w-[3.5px] rounded-l-[2px] bg-[#333]" />

        {/* Right — power button */}
        <div className="absolute -right-[3.5px] top-[130px] h-[52px] w-[3.5px] rounded-r-[2px] bg-[#333]" />

        {/* S-Pen slot — thin raised strip on bottom-right edge */}
        <div className="absolute -right-[4px] bottom-[22px] h-[70px] w-[4px] rounded-r-[1px] bg-[#0a0a0a]" />
        <div className="absolute right-[1px] bottom-[22px] h-[70px] w-[2px] rounded-sm bg-[#262626]" />

        {/* USB-C bottom center */}
        <div className="absolute bottom-[1px] left-1/2 h-[5px] w-[22px] -translate-x-1/2 rounded-full bg-[#0a0a0a]" />
        {/* Speaker grilles bottom */}
        <div className="absolute bottom-[2px] left-[28px] flex gap-[2.5px]">
          {[...Array(5)].map((_, i) => <div key={i} className="h-[3px] w-[3px] rounded-full bg-[#0a0a0a]" />)}
        </div>
        <div className="absolute bottom-[2px] right-[28px] flex gap-[2.5px]">
          {[...Array(5)].map((_, i) => <div key={i} className="h-[3px] w-[3px] rounded-full bg-[#0a0a0a]" />)}
        </div>

        {/* Screen */}
        <div className="overflow-hidden rounded-[1.5rem]" style={{ background: statusBg }}>
          {/* Status bar — centered punch-hole selfie camera */}
          <div className="relative flex items-center justify-between px-4 pt-3 pb-1.5" style={{ background: statusBg }}>
            <span className="text-[10px] font-medium" style={{ color: timeColor }}>12:00</span>
            {/* Punch-hole — small centered dot */}
            <div className="absolute left-1/2 top-[6px] h-[10px] w-[10px] -translate-x-1/2 rounded-full bg-[#0a0a0a] ring-[1.5px] ring-[#1a1a1a]" />
            <div className="flex items-center gap-[5px]">
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <rect x="0" y="5" width="2.5" height="4" rx="0.5" fill={iconFill} fillOpacity="0.45"/>
                <rect x="3.2" y="3" width="2.5" height="6" rx="0.5" fill={iconFill} fillOpacity="0.65"/>
                <rect x="6.4" y="1.5" width="2.5" height="7.5" rx="0.5" fill={iconFill} fillOpacity="0.85"/>
                <rect x="9.6" y="0" width="2.5" height="9" rx="0.5" fill={iconFill}/>
              </svg>
              <svg width="12" height="9" viewBox="0 0 14 11" fill="none">
                <path d="M7 9.5a1 1 0 110 2 1 1 0 010-2z" fill={iconFill}/>
                <path d="M3.5 6.5C4.8 5.3 6 4.7 7 4.7s2.2.6 3.5 1.8" stroke={iconFill} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                <path d="M1 3.8C3 1.8 5 .7 7 .7s4 1.1 6 3.1" stroke={iconFill} strokeWidth="1.3" strokeLinecap="round" fill="none" strokeOpacity="0.55"/>
              </svg>
              <div className="flex items-center gap-[2px]">
                <div className="h-[9px] w-[16px] rounded-[2px] p-[1.5px]" style={{ border: `1px solid ${iconFill}88` }}>
                  <div className="h-full w-[70%] rounded-[1px]" style={{ background: iconFill }} />
                </div>
                <div className="h-[5px] w-[2px] rounded-r-sm" style={{ background: `${iconFill}88` }} />
              </div>
            </div>
          </div>

          {/* One UI 7 notification shade */}
          <div className="min-h-[455px] px-2.5 py-2" style={{ background: shadeBg }}>
            {/* One UI notification card */}
            <div className={`overflow-hidden rounded-[22px] ring-[0.5px] ${cardRing}`} style={{ background: cardBg }}>
              {/* App row */}
              <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-1">
                <div className="flex h-[15px] w-[15px] items-center justify-center rounded-[4px] bg-accent-500">
                  <span className="text-[6px] font-bold text-white leading-none">{iconLabel}</span>
                </div>
                <span className="flex-1 text-[10px] font-semibold" style={{ color: appName }}>Push App</span>
                <span className="text-[9px]" style={{ color: timestamp }}>Just now</span>
                <button type="button" className="ml-1 text-[11px]" style={{ color: closeBtn }}>✕</button>
              </div>
              {/* Content row */}
              <div className="flex items-start gap-2.5 px-3.5 pb-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug line-clamp-1" style={{ color: titleColor }}>
                    {title || 'Notification title'}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug line-clamp-2" style={{ color: bodyColor }}>
                    {body || 'Notification body text'}
                  </p>
                </div>
                {leftIconUrl ? (
                  <img src={leftIconUrl} alt="" className="h-[48px] w-[48px] flex-shrink-0 rounded-[14px] object-cover" />
                ) : (
                  <div className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-[14px] bg-accent-500/20">
                    <span className="text-[14px] font-bold text-accent-400">{iconLabel}</span>
                  </div>
                )}
              </div>
              {imageUrl ? (
                <img src={imageUrl} alt="" className="sim-bigpic w-full object-cover" />
              ) : null}
            </div>
            <p className="mt-2 text-center text-[8px]" style={{ color: swipeHint }}>swipe to dismiss</p>
          </div>

          {/* One UI gesture bar */}
          <div className="flex justify-center pb-2.5 pt-1.5" style={{ background: gestureBg }}>
            <div className={`h-[3.5px] w-[80px] rounded-full ${gestureBar}`} />
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-tx-muted">Samsung Galaxy S26 Ultra</p>
    </div>
  );
}

function IOSPhone({ title, body, icon, leftIconUrl, imageUrl, isDark }: PhonePreviewProps) {
  const iconLabel = icon.replace('ic_notif_', '').slice(0, 3).toUpperCase();
  const thumbUrl = imageUrl || leftIconUrl;

  // Screen palette switches with mode
  const screenBg    = isDark ? '#1c1c1e' : '#f2f2f7';
  const wallpaperBg = isDark ? '#0d0d0d' : '#e8ecf2';
  const timeColor   = isDark ? '#ffffff' : '#1c1c1e';
  const iconFill    = isDark ? 'white' : '#1c1c1e';
  const homeBg      = isDark ? '#1c1c1e' : '#f2f2f7';
  const homeBar     = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(28,28,30,0.18)';
  // Notification card: dark = frosted dark, light = frosted white (existing .sim-ios-notif)
  const notifBg     = isDark ? 'rgba(50,50,52,0.88)' : undefined;
  const notifRadius = 'rounded-[22px]';
  const appMeta     = isDark ? '#aeaeb2' : '#8e8e93';
  const titleColor  = isDark ? '#ffffff' : '#1c1c1e';
  const bodyColor   = isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.8)';
  // Stack peek card
  const moreCardBg  = isDark ? 'rgba(50,50,52,0.55)' : 'rgba(255,255,255,0.50)';

  return (
    <div className="sim-phone-frame mx-auto">
      {/* iPhone 17 Pro Max — titanium flat-edge frame, large rounded corners */}
      <div className="relative rounded-[3.2rem] bg-[#2c2c2e] p-[7px] ring-1 ring-white/15">
        {/* Titanium brushed highlight — top edge */}
        <div className="pointer-events-none absolute inset-[4px] rounded-[2.8rem] ring-[0.5px] ring-white/10" />

        {/* Left — Action button (top, shorter), Volume Up, Volume Down */}
        <div className="absolute -left-[3.5px] top-[68px] h-[18px] w-[3.5px] rounded-l-[2px] bg-[#3a3a3c]" />
        <div className="absolute -left-[3.5px] top-[102px] h-[38px] w-[3.5px] rounded-l-[2px] bg-[#3a3a3c]" />
        <div className="absolute -left-[3.5px] top-[148px] h-[38px] w-[3.5px] rounded-l-[2px] bg-[#3a3a3c]" />

        {/* Right — Power button, Camera Control button (below power) */}
        <div className="absolute -right-[3.5px] top-[110px] h-[52px] w-[3.5px] rounded-r-[2px] bg-[#3a3a3c]" />
        <div className="absolute -right-[3.5px] top-[176px] h-[38px] w-[3.5px] rounded-r-[2px] bg-[#3a3a3c]" />

        {/* USB-C bottom center */}
        <div className="absolute bottom-[1.5px] left-1/2 h-[5px] w-[20px] -translate-x-1/2 rounded-full bg-[#111]" />
        {/* Speaker grilles */}
        <div className="absolute bottom-[2.5px] left-[30px] flex gap-[2.5px]">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[3px] w-[3px] rounded-full bg-[#111]" />)}
        </div>
        <div className="absolute bottom-[2.5px] right-[30px] flex gap-[2.5px]">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[3px] w-[3px] rounded-full bg-[#111]" />)}
        </div>

        {/* Screen */}
        <div className="overflow-hidden rounded-[2.8rem]" style={{ background: screenBg }}>
          {/* Status bar */}
          <div className="relative flex items-center justify-between px-5 pb-1 pt-3.5">
            <span className="text-[12px] font-semibold" style={{ color: timeColor }}>9:41</span>
            {/* Dynamic Island — pill, always black */}
            <div className="absolute left-1/2 top-2 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
            <div className="flex items-center gap-[4px]">
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <rect x="0" y="5" width="2.5" height="4" rx="0.5" fill={iconFill} fillOpacity="0.35"/>
                <rect x="3.2" y="3" width="2.5" height="6" rx="0.5" fill={iconFill} fillOpacity="0.55"/>
                <rect x="6.4" y="1.5" width="2.5" height="7.5" rx="0.5" fill={iconFill} fillOpacity="0.75"/>
                <rect x="9.6" y="0" width="2.5" height="9" rx="0.5" fill={iconFill}/>
              </svg>
              <svg width="12" height="9" viewBox="0 0 14 11" fill="none">
                <path d="M7 9.5a1 1 0 110 2 1 1 0 010-2z" fill={iconFill}/>
                <path d="M3.5 6.5C4.8 5.3 6 4.7 7 4.7s2.2.6 3.5 1.8" stroke={iconFill} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                <path d="M1 3.8C3 1.8 5 .7 7 .7s4 1.1 6 3.1" stroke={iconFill} strokeWidth="1.3" strokeLinecap="round" fill="none" strokeOpacity="0.45"/>
              </svg>
              <div className="flex items-center gap-[2px]">
                <div className="h-[9px] w-[16px] rounded-[2px] p-[1.5px]" style={{ border: `1px solid ${iconFill}88` }}>
                  <div className="h-full w-[70%] rounded-[1px]" style={{ background: iconFill }} />
                </div>
                <div className="h-[5px] w-[2px] rounded-r-sm" style={{ background: `${iconFill}72` }} />
              </div>
            </div>
          </div>

          {/* Lock screen */}
          <div className="min-h-[453px] px-3 py-3" style={{ background: wallpaperBg }}>
            {/* iOS notification banner */}
            <div
              className={`overflow-hidden ${notifRadius} backdrop-blur-xl`}
              style={notifBg ? { background: notifBg } : undefined}
            >
              {/* keep .sim-ios-notif class only in light mode for the CSS rule */}
              <div className={!isDark ? 'sim-ios-notif overflow-hidden rounded-[22px]' : ''}>
                {/* App header */}
                <div className="flex items-center gap-2 px-3.5 pt-3 pb-1">
                  <div className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-[7px] bg-accent-500">
                    <span className="text-[7px] font-bold text-white leading-none">{iconLabel}</span>
                  </div>
                  <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: appMeta }}>
                    Push App
                  </span>
                  <span className="text-[10px]" style={{ color: appMeta }}>now</span>
                </div>
                {/* Notification content */}
                <div className="flex items-start gap-2.5 px-3.5 pb-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-snug line-clamp-1" style={{ color: titleColor }}>
                      {title || 'Notification title'}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug line-clamp-2" style={{ color: bodyColor }}>
                      {body || 'Notification body text'}
                    </p>
                  </div>
                  {thumbUrl ? (
                    <img src={thumbUrl} alt="" className="h-[46px] w-[46px] flex-shrink-0 rounded-[12px] object-cover" />
                  ) : (
                    <div className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[12px] bg-accent-500/15">
                      <span className="text-[13px] font-bold text-accent-500">{iconLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stacked second notification (iOS stack effect) */}
            <div
              className="mx-2 mt-[-4px] rounded-b-[18px] px-3 py-1.5 text-center text-[9px] backdrop-blur-xl"
              style={{ background: moreCardBg, color: appMeta }}
            >
              1 more notification
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-2.5 pt-1" style={{ background: homeBg }}>
            <div className="h-[4px] w-[100px] rounded-full" style={{ background: homeBar }} />
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-tx-muted">iPhone 17 Pro Max</p>
    </div>
  );
}
