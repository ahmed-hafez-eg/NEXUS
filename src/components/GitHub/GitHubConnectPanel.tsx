import React, { useState } from 'react';
import { Github, CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw, Key, LogOut } from 'lucide-react';
import { useGitHubStore } from '../../store/useGitHubStore';
import { openExternalUrl } from '../../utils/opener';
import { ArgonButton } from '../UI/ArgonButton';
import { showToast } from '../../store/useToastStore';

export const GitHubConnectPanel: React.FC<{ isDark?: boolean }> = ({ isDark = true }) => {
  const token = useGitHubStore(s => s.token);
  const user = useGitHubStore(s => s.user);
  const isConnecting = useGitHubStore(s => s.isConnecting);
  const deviceCodeInfo = useGitHubStore(s => s.deviceCodeInfo);
  const authError = useGitHubStore(s => s.authError);
  const startDeviceAuth = useGitHubStore(s => s.startDeviceAuth);
  const cancelDeviceAuth = useGitHubStore(s => s.cancelDeviceAuth);
  const connectWithManualToken = useGitHubStore(s => s.connectWithManualToken);
  const disconnect = useGitHubStore(s => s.disconnect);

  const [copied, setCopied] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState('');

  const handleCopyCode = () => {
    if (deviceCodeInfo?.user_code) {
      navigator.clipboard.writeText(deviceCodeInfo.user_code);
      setCopied(true);
      showToast.info('Device code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenAuthUrl = () => {
    if (deviceCodeInfo?.user_code) {
      navigator.clipboard.writeText(deviceCodeInfo.user_code);
    }
    openExternalUrl(deviceCodeInfo?.verification_uri || 'https://github.com/login/device');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    const ok = await connectWithManualToken(manualToken);
    if (ok) {
      setManualToken('');
      setShowManualInput(false);
      showToast.success('Connected to GitHub!');
    }
  };

  const bgCard = isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-slate-50 border-slate-200';

  if (token && user) {
    return (
      <div className={`p-4.5 rounded-2xl border ${bgCard} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none`}>
        <div className="flex items-center gap-3">
          <img
            src={user.avatar_url}
            alt={user.login}
            className="w-11 h-11 rounded-2xl border-2 border-emerald-400/50 shadow-md object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{user.name || user.login}</span>
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                <CheckCircle2 size={12} /> Connected
              </span>
            </div>
            <p className="text-xs text-[#a1a1a1]">@{user.login}</p>
          </div>
        </div>

        <button
          onClick={disconnect}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 transition flex items-center gap-1.5"
        >
          <LogOut size={13} /> Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4.5 rounded-2xl border ${bgCard} flex flex-col gap-3.5 select-none`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] text-white flex items-center justify-center border border-white/10 shadow-sm">
            <Github size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">GitHub Connection</h4>
            <p className="text-xs text-[#a1a1a1]">
              Link repos, sync contribution activity, and attach proof-of-work.
            </p>
          </div>
        </div>
      </div>

      {authError && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
          <div className="flex-1">{authError}</div>
        </div>
      )}

      {/* Device flow pending display */}
      {isConnecting && deviceCodeInfo?.user_code ? (
        <div className="p-4.5 rounded-2xl bg-[#0a0a0a] border border-sky-400/30 flex flex-col items-center text-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2CD9FF]">
            <RefreshCw size={14} className="animate-spin" /> Authorizing via GitHub Device Flow...
          </div>
          <p className="text-xs text-[#a1a1a1]">
            Copy this one-time code and click to confirm in your browser:
          </p>

          <div className="flex items-center gap-3 bg-[#111111] px-5 py-2.5 rounded-xl border border-sky-400/30 shadow-argon-primary">
            <span className="font-mono text-xl font-extrabold tracking-widest text-[#2CD9FF]">
              {deviceCodeInfo.user_code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
              title="Copy code"
            >
              <Copy size={16} />
            </button>
          </div>

          {copied && <span className="text-[11px] font-bold text-emerald-400">Code copied to clipboard!</span>}

          <div className="flex items-center gap-2 mt-1">
            <ArgonButton
              variant="primary"
              size="sm"
              onClick={handleOpenAuthUrl}
              rightIcon={<ExternalLink size={13} />}
            >
              Open GitHub Authorization
            </ArgonButton>
            <button
              onClick={cancelDeviceAuth}
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <ArgonButton
              variant="primary"
              size="sm"
              onClick={startDeviceAuth}
              disabled={isConnecting}
              leftIcon={<Github size={15} />}
            >
              Connect with GitHub OAuth
            </ArgonButton>
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition flex items-center gap-1.5"
            >
              <Key size={13} /> {showManualInput ? 'Hide Token Input' : 'Use Personal Access Token'}
            </button>
          </div>

          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="mt-2 flex items-center gap-2">
              <input
                type="password"
                placeholder="Paste Personal Access Token (ghp_...)"
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white placeholder-[#707E94] focus:outline-none focus:border-[#2CD9FF]"
              />
              <ArgonButton
                variant="primary"
                size="sm"
                type="submit"
                disabled={!manualToken.trim() || isConnecting}
              >
                Save
              </ArgonButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
