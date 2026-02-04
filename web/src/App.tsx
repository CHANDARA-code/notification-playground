import { useEffect, useMemo, useState } from 'react';

import {
  activateConfig,
  apiBaseUrl,
  createConfig,
  deleteConfig,
  listConfigs,
  sendNotification,
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
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<object | null>(null);

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

  useEffect(() => {
    void loadConfigs();
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

  const handleSend = async () => {
    setError(null);
    setStatus('Sending...');

    const activeTopics =
      activeConfig?.topics && activeConfig.topics.length > 0
        ? activeConfig.topics
        : activeConfig?.topic
          ? [activeConfig.topic]
          : [];

    if (!token.trim() && activeTopics.length === 0) {
      setError('FCM token or an active topic is required.');
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
    <div className="min-h-screen px-6 py-10 text-haze-100 md:px-12">
      <header className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.3em] text-haze-200">
          Push Playground
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-5xl">
          Dynamic Icon Notification Studio
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-haze-200 md:text-base">
          Craft data-only FCM payloads with custom Android icons. The server will
          hand it off to Firebase Admin, and your Flutter app renders the
          notification.
        </p>
      </header>

      <main className="mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-[70%_30%]">
        <section className="glass rounded-3xl p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Payload</h2>
            <span className="text-xs text-haze-200">API: {apiBaseUrl}</span>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="rounded-2xl border border-white/10 bg-ink-800 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-haze-200">
                Config manager
              </p>
              <div className="mt-4 grid gap-4">
                <Field label="Name" hint="Config label">
                  <input
                    value={configName}
                    onChange={(event) => setConfigName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink-700 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Topics" hint="Comma separated (e.g. ahaha, test, ios, android, all)">
                    <input
                      value={configTopics}
                      onChange={(event) => setConfigTopics(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink-700 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
                    />
                  </Field>
                  <Field label="Android priority" hint="FCM Android priority">
                    <select
                      value={configAndroidPriority}
                      onChange={(event) =>
                        setConfigAndroidPriority(
                          event.target.value as ConfigPriority,
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-ink-700 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
                    >
                      <option value="high">high</option>
                      <option value="normal">normal</option>
                    </select>
                  </Field>
                  <Field label="iOS priority" hint="APNs priority">
                    <select
                      value={configApnsPriority}
                      onChange={(event) =>
                        setConfigApnsPriority(
                          event.target.value as ConfigPriority,
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-ink-700 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
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
                  className="inline-flex items-center justify-center rounded-xl bg-ink-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-ink-600"
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
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30"
                  >
                    Cancel
                  </button>
                ) : null}
                {configStatus ? (
                  <span className="text-xs text-haze-200">{configStatus}</span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3">
                {configs.length === 0 ? (
                  <span className="text-xs text-haze-200">
                    No configs yet.
                  </span>
                ) : (
                  configs.map((config) => (
                    <div
                      key={config.id}
                      className="rounded-2xl border border-white/10 bg-ink-700 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {config.name ?? 'Untitled'}
                        </p>
                        <p className="text-xs text-haze-200">
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
                          className="rounded-xl border border-white/10 px-3 py-1 text-xs text-white transition hover:border-white/30"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActivate(config.id)}
                          className="rounded-xl border border-white/10 px-3 py-1 text-xs text-white transition hover:border-white/30"
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

            <Field label="FCM token">
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                rows={2}
                placeholder="Optional if an active topic is set"
                className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" required>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
                />
              </Field>
              <Field label="Body" required>
                <input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Small icon" hint="Must be a bundled drawable">
                <select
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
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
                  value={leftIconUrl}
                  onChange={(event) => setLeftIconUrl(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
                />
              </Field>
            </div>
            <Field label="Image URL" hint="Optional big picture">
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
              />
            </Field>

            <Field label="Custom data (JSON)">
              <textarea
                value={dataJson}
                onChange={(event) => setDataJson(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white outline-none focus:border-accent-400"
              />
            </Field>

            {error ? (
              <div className="rounded-xl border border-accent-600/60 bg-accent-600/10 px-4 py-3 text-sm text-accent-400">
                {error}
              </div>
            ) : null}
            {status ? (
              <div className="rounded-xl border border-white/10 bg-ink-700 px-4 py-3 text-sm text-haze-100">
                {status}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center justify-center rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-400"
            >
              Send test push
            </button>
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-white">Preview</h2>
          <div className="mt-5 rounded-2xl border border-white/10 bg-ink-800 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/20 text-sm font-semibold text-accent-400">
                {icon.replace('ic_notif_', '').slice(0, 4).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-haze-200">{body}</p>
                {imageUrl ? (
                  <p className="mt-3 text-xs text-haze-200">{imageUrl}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-haze-200">
              Data payload
            </p>
            <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-ink-800 p-4 text-xs text-haze-100">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-haze-200">
              Last response
            </p>
            <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-ink-800 p-4 text-xs text-haze-100">
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
    <label className="grid gap-2 text-sm text-haze-200">
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-haze-200">
        {label}
        {required ? <span className="text-accent-400">*</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-haze-200">{hint}</span> : null}
    </label>
  );
}
