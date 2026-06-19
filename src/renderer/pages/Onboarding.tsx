import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_IDS, type PlatformId } from '@shared/types/platform';

export default function Onboarding() {
  const { platform } = useParams<{ platform: PlatformId }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'waiting' | 'verifying' | 'done' | 'failed'>('intro');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!platform || !(PLATFORM_IDS as readonly string[]).includes(platform)) {
    return <div className="p-8 text-muted">Unknown platform.</div>;
  }
  const name = PLATFORM_DISPLAY_NAMES[platform];

  async function start() {
    setStep('waiting');
    setErrorMessage(null);
    const r = await window.marketplace.startLogin(platform as PlatformId);
    if (!r.ok) {
      setErrorMessage('Could not open a login window.');
      setStep('failed');
    }
  }

  async function confirm() {
    setStep('verifying');
    const r = await window.marketplace.confirmLoggedIn(platform as PlatformId);
    if (r.ok && r.loggedIn) {
      setStep('done');
    } else {
      setErrorMessage("Couldn't detect a logged-in session yet. Make sure you're past the login page in the browser window.");
      setStep('waiting');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-lg font-semibold">Log in to {name}</h1>
      <p className="text-sm text-muted">
        A browser window will open. Sign in normally — including 2FA. Your session is stored in a private profile under{' '}
        <code className="text-xs">%APPDATA%/marketplace-tool/profiles/{platform}</code>.
      </p>

      {step === 'intro' && (
        <button onClick={start} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600">
          Open login window
        </button>
      )}

      {(step === 'waiting' || step === 'verifying') && (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
            {step === 'verifying' ? 'Verifying…' : 'Browser window opened. Sign in, then click below.'}
          </div>
          {step === 'waiting' && (
            <button onClick={confirm} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600">
              I'm logged in
            </button>
          )}
          {errorMessage && <div className="text-xs text-danger">{errorMessage}</div>}
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-3">
          <div className="rounded-md border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-success">
            Logged in to {name}. You can close the browser window.
          </div>
          <button onClick={() => navigate('/settings')} className="rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover">
            Back to Settings
          </button>
        </div>
      )}

      {step === 'failed' && errorMessage && <div className="text-xs text-danger">{errorMessage}</div>}
    </div>
  );
}
