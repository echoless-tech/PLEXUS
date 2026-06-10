import React from 'react';
import { Check, Moon, Sun, Palette, Sparkles, Layers, Wallet, TrendingUp, Bell, Cpu, Zap } from 'lucide-react';
import { PageHeader, Tile, Label, Button } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import { ACCENT_THEME_LIST } from '../theme/accents';
import { GEMINI_MODELS } from '../services/ai';
import { cn } from '../lib/cn';

const Settings: React.FC = () => {
  const accentTheme = useAppStore((s) => s.accentTheme);
  const setAccentTheme = useAppStore((s) => s.setAccentTheme);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const aiModel = useAppStore((s) => s.aiModel);
  const setAiModel = useAppStore((s) => s.setAiModel);
  const showToast = useAppStore((s) => s.showToast);

  const mode = darkMode ? 'dark' : 'light';

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        subtitle="Personalise how NODAL looks and feels."
      />

      {/* Appearance */}
      <Tile className="gap-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
            <Sun className="h-4 w-4" />
          </span>
          <Label>Appearance</Label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[0.9375rem] font-semibold text-ink">Mode</p>
            <p className="text-[0.8125rem] text-muted">Switch between light and dark surfaces.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-inset p-1">
            <button
              onClick={() => darkMode && toggleDarkMode()}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-[0.8125rem] font-semibold transition-colors',
                !darkMode ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              onClick={() => !darkMode && toggleDarkMode()}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-[0.8125rem] font-semibold transition-colors',
                darkMode ? 'bg-surface-2 text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </div>
      </Tile>

      {/* Accent theme */}
      <Tile className="gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
              <Palette className="h-4 w-4" />
            </span>
            <Label>Accent theme</Label>
          </div>
          <span className="text-[0.8125rem] text-muted">Applied instantly</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACCENT_THEME_LIST.map((theme) => {
            const selected = theme.key === accentTheme;
            const swatch = theme[mode].accent;
            const soft = theme[mode].accentSoft;
            return (
              <button
                key={theme.key}
                onClick={() => {
                  setAccentTheme(theme.key);
                  showToast(`${theme.label} theme applied.`, 'success');
                }}
                className={cn(
                  'group relative flex flex-col gap-3 rounded-[18px] bg-surface-2 p-4 text-left transition-all',
                  selected ? 'ring-2 ring-accent' : 'hover:bg-surface-inset/50',
                )}
              >
                {selected && (
                  <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-contrast">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}

                {/* Swatch preview */}
                <div className="flex items-center gap-2">
                  <span
                    className="h-10 w-10 shrink-0 rounded-[12px]"
                    style={{ backgroundColor: swatch }}
                  />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="h-2.5 w-full rounded-full" style={{ backgroundColor: soft }} />
                    <span className="h-2.5 w-2/3 rounded-full" style={{ backgroundColor: soft }} />
                  </div>
                </div>

                <div>
                  <p className="text-[0.9375rem] font-bold text-ink">{theme.label}</p>
                  <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">{theme.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Tile>

      {/* AI model */}
      <Tile className="gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
              <Cpu className="h-4 w-4" />
            </span>
            <Label>AI model</Label>
          </div>
          <span className="text-[0.8125rem] text-muted">Powers every AI feature</span>
        </div>

        <p className="-mt-2 text-[0.8125rem] text-muted">
          Choose which Google Gemini model drives the coach, voice assistant, and AI Hub. Flash
          models are faster and use fewer tokens; Pro models are higher quality.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GEMINI_MODELS.map((model) => {
            const selected = model.id === aiModel;
            return (
              <button
                key={model.id}
                onClick={() => {
                  setAiModel(model.id);
                  showToast(`${model.label} is now active.`, 'success');
                }}
                className={cn(
                  'group relative flex items-start gap-3 rounded-[18px] bg-surface-2 p-4 text-left transition-all',
                  selected ? 'ring-2 ring-accent' : 'hover:bg-surface-inset/50',
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent">
                  <Zap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-bold text-ink">{model.label}</p>
                  <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">{model.description}</p>
                </div>
                {selected && (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-contrast">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Tile>

      {/* Live preview */}
      <Tile className="gap-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
            <Sparkles className="h-4 w-4" />
          </span>
          <Label>Preview</Label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent">Primary action</Button>
          <Button variant="soft">Soft action</Button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[0.8125rem] font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Accent badge
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-contrast">
            Filled pill
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[16px] bg-accent p-4">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-accent-contrast/70">Revenue</p>
            <p className="tnum mt-1 text-[1.5rem] font-bold text-accent-contrast">R48.2k</p>
          </div>
          <div className="rounded-[16px] bg-accent-soft p-4">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-accent">Orders</p>
            <p className="tnum mt-1 text-[1.5rem] font-bold text-ink">128</p>
          </div>
          <div className="rounded-[16px] bg-surface-inset p-4">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted">Margin</p>
            <p className="tnum mt-1 text-[1.5rem] font-bold text-accent">32%</p>
          </div>
        </div>
      </Tile>

      {/* Glassmorphism demo */}
      <Tile flush className="overflow-hidden">
        <div className="flex items-center gap-2 px-6 pt-6">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
            <Layers className="h-4 w-4" />
          </span>
          <Label>Glassmorphism</Label>
        </div>
        <p className="mt-2 px-6 text-[0.8125rem] text-muted">
          Frosted translucent panes blur whatever sits behind them. Here they float over a vivid
          gradient so you can see the effect at full strength.
        </p>

        {/* Vivid stage with floating glass panes */}
        <div
          className="relative mt-5 overflow-hidden p-6 sm:p-8"
          style={{
            background:
              'radial-gradient(28rem 28rem at 8% 0%, var(--accent), transparent 60%), radial-gradient(26rem 26rem at 100% 20%, color-mix(in srgb, var(--positive) 70%, transparent), transparent 60%), radial-gradient(30rem 30rem at 70% 110%, var(--accent), transparent 60%), linear-gradient(135deg, #1b1b22, #2a2533)',
          }}
        >
          {/* Decorative blurred orbs behind the glass */}
          <div className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Primary glass card with sheen */}
            <div className="glass-strong glass-sheen relative col-span-1 overflow-hidden rounded-[20px] p-5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur">
                  <Sparkles className="h-3 w-3" /> Live balance
                </span>
                <Wallet className="h-5 w-5 text-white/80" />
              </div>
              <p className="tnum mt-4 text-[2rem] font-bold text-white drop-shadow-sm">R 128,540</p>
              <div className="mt-1 flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/85">
                <TrendingUp className="h-4 w-4" /> +12.4% this month
              </div>
              <div className="mt-5 flex gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur">Income</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[0.75rem] font-semibold text-white/80 backdrop-blur">Expenses</span>
              </div>
            </div>

            {/* Stacked smaller glass cards */}
            <div className="flex flex-col gap-4">
              <div className="glass relative flex items-center gap-3 rounded-[18px] p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/20 text-white backdrop-blur">
                  <Bell className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-semibold text-white">3 new alerts</p>
                  <p className="truncate text-[0.75rem] text-white/75">Low stock & payments</p>
                </div>
              </div>
              <div className="glass relative rounded-[18px] p-4">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/70">Orders today</p>
                <p className="tnum mt-1 text-[1.5rem] font-bold text-white">42</p>
              </div>
            </div>
          </div>

          {/* Frosted toolbar */}
          <div className="glass relative mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-4 py-3">
            <span className="text-[0.875rem] font-semibold text-white">Frosted control bar</span>
            <div className="flex gap-2">
              <button className="rounded-full bg-white/20 px-4 py-1.5 text-[0.8125rem] font-semibold text-white backdrop-blur transition-colors hover:bg-white/30">
                Action
              </button>
              <button className="rounded-full bg-white/10 px-4 py-1.5 text-[0.8125rem] font-semibold text-white/85 backdrop-blur transition-colors hover:bg-white/20">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </Tile>
    </div>
  );
};

export default Settings;
