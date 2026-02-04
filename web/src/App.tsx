import { useMemo, useState } from 'react';

import { apiBaseUrl, sendNotification } from '@lib/api';

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

export default function App() {
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('Sale now live');
  const [body, setBody] = useState('Tap to view the deal');
  const [icon, setIcon] = useState(iconOptions[0]);
  const [leftIconUrl, setLeftIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80',
  );
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

  const preview = {
    title,
    body,
    icon,
    left_icon_url: leftIconUrl,
    imageUrl,
    data: parsedData ?? {},
  };

  const handleSend = async () => {
    setError(null);
    setStatus('Sending...');

    if (!token.trim()) {
      setError('FCM token is required.');
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
        token,
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

      <main className="mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-[40%_60%]">
        <section className="glass rounded-3xl p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Payload</h2>
            <span className="text-xs text-haze-200">API: {apiBaseUrl}</span>
          </div>

          <div className="mt-6 grid gap-5">
            <Field label="FCM token" required>
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                rows={2}
                placeholder="Paste the device token from Flutter"
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
