'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';
import { formatUsd, useLive } from '@/lib/dexscreener';
import { KEYS, isFinePointer, prefersReducedMotion, storage, store, useUI } from '@/lib/store';
import { setSoundEnabled, uiTick } from '@/lib/sound';
import { getLenis } from './Effects';
import { INTRO_REPLAY } from './Intro';
import { Blocks } from './Blocks';

/** The files on this machine, in order. Ids match each section's id. */
export const FILES: [id: string, n: string, label: string][] = [
  ['top', '00', 'HOME'],
  ['file', '01', 'ARCHIVE'],
  ['privacy', '02', 'PRIVACY'],
  ['rewards', '03', 'REWARDS'],
  ['redact', '04', 'REDACT'],
  ['buy', '05', 'HOW TO BUY'],
  ['chart', '06', 'CHART'],
];

export function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const l = getLenis();
  if (l) l.scrollTo(el, { offset: id === 'top' ? 0 : -24 });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function Toggle({ label, on, onClick, className = '' }: { label: string; on: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`flex h-full items-center gap-1.5 px-2 hover:bg-paper hover:text-void ${className}`}>
      {label} <span className={on ? 'phos' : 'line-through'}>{on ? 'ON' : 'OFF'}</span>
    </button>
  );
}

export function Taskbar() {
  const sight = useUI((s) => s.sight);
  const sound = useUI((s) => s.sound);
  const live = useLive();
  // DexScreener's public API has no holder count. The field stays classified.
  const holders = live.status === 'idle' || live.status === 'loading' ? null : 'REDACTED';
  const mc = live.status === 'idle' || live.status === 'loading' ? null : formatUsd(live.pair?.marketCap ?? live.pair?.fdv);
  const [canSight, setCanSight] = useState(false);
  const [clock, setClock] = useState('--:--:--');
  const [active, setActive] = useState('top');
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fine = isFinePointer() && !prefersReducedMotion() && config.features.vision;
    setCanSight(fine);
    if (fine && storage.get(KEYS.sight) === 'off') store.set({ sight: false });
  }, []);

  // UTC clock — no location, no timezone, no clue.
  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Which file is on screen.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    FILES.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // Start menu: Escape and outside-click close it.
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        startRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !startRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [menu]);

  const toggleSight = () => {
    const next = !store.get().sight;
    store.set({ sight: next });
    storage.set(KEYS.sight, next ? 'on' : 'off');
    uiTick();
  };
  const toggleSound = () => {
    const next = !store.get().sound;
    setSoundEnabled(next);
    store.set({ sound: next });
    uiTick(next ? 1.2 : 0.8);
  };
  const open = (id: string) => {
    setMenu(false);
    uiTick();
    goTo(id);
  };

  const val = (v: string | null) => (v === null ? '—' : v);

  return (
    <div
      role="region"
      aria-label="Taskbar"
      className={`fixed inset-x-0 bottom-0 z-[60] h-[var(--tb)] border-t border-paper bg-void p-[3px]`}
    >
      {menu && (
        <div
          ref={menuRef}
          id="startmenu"
          role="menu"
          aria-label="Start menu"
          className="absolute bottom-[var(--tb)] left-[3px] w-[248px] border border-paper bg-void p-1"
          style={{ animation: 'menu-on 220ms cubic-bezier(.16,1,.3,1)' }}
        >
          <div className="stripes mb-1 flex h-[22px] items-center px-1.5">
            <span className="w-t">
              BLIND APE HOE <b>/</b> FILES
            </span>
          </div>
          {FILES.map(([id, n, label]) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => open(id)}
              className={`label flex w-full items-center gap-3 px-2 py-1.5 text-left hover:bg-paper hover:text-void focus-visible:bg-paper focus-visible:text-void ${
                active === id ? 'phos' : ''
              }`}
            >
              <span className="w-6">{n}</span>
              <span className="flex-1">{label}</span>
              {active === id && <span aria-hidden="true">◂</span>}
            </button>
          ))}
          <div className="rule-b my-1 h-px" aria-hidden="true" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              window.dispatchEvent(new Event(INTRO_REPLAY));
            }}
            className="label flex w-full px-2 py-1.5 text-left hover:bg-paper hover:text-void focus-visible:bg-paper focus-visible:text-void"
          >
            REPLAY INTRO
          </button>
          {canSight && (
            <button type="button" role="menuitemcheckbox" aria-checked={sight} onClick={toggleSight} className="label flex w-full justify-between px-2 py-1.5 text-left hover:bg-paper hover:text-void">
              SIGHT <span>{sight ? 'ON' : 'OFF'}</span>
            </button>
          )}
          <button type="button" role="menuitemcheckbox" aria-checked={sound} onClick={toggleSound} className="label flex w-full justify-between px-2 py-1.5 text-left hover:bg-paper hover:text-void">
            SOUND <span>{sound ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}

      <div className="label flex h-full items-stretch gap-[4px] text-[15px] tracking-[0.1em]">
        <button
          ref={startRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-controls="startmenu"
          onClick={() => {
            setMenu((m) => !m);
            uiTick(0.9);
          }}
          className="tiny flex flex-none items-center gap-2 bg-paper px-3 font-bold text-void [text-shadow:none] hover:bg-void hover:text-paper hover:outline hover:outline-1 hover:outline-paper"
        >
          <span aria-hidden="true" className="block h-[5px] w-[12px] bg-current" />
          START
        </button>

        <nav aria-label="Files" className="hidden min-w-0 flex-1 gap-[3px] overflow-hidden xl:flex">
          {FILES.slice(1).map(([id, n, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              aria-current={active === id ? 'true' : undefined}
              className={`flex min-w-0 items-center gap-2 border border-paper px-2.5 ${
                active === id ? 'bg-paper text-void [text-shadow:none]' : 'hover:bg-paper hover:text-void'
              }`}
            >
              <span>{n}</span>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
        <div className="flex-1 xl:hidden" />

        <div className="rule-l flex min-w-0 flex-none items-center pl-1.5">
          <span className="hidden items-center gap-2 px-2 md:flex">
            <span className="dot blink" aria-hidden="true" />
            <Blocks text={config.copy.status.node} label="Node redacted" /> <span className="phos">{config.copy.status.online}</span>
          </span>
          <span className="hidden px-2 2xl:inline">
            HOLDERS <span className="phos">{val(holders)}</span>
          </span>
          <span className="px-2" aria-live="polite">
            MC <span className="phos">{val(mc)}</span>
          </span>
          {canSight && <Toggle label="SIGHT" on={sight} onClick={toggleSight} className="hidden lg:flex" />}
          <Toggle label="SOUND" on={sound} onClick={toggleSound} />
          <span className="hidden px-2 tabular-nums sm:inline" aria-label={`UTC ${clock}`}>
            {clock}
          </span>
        </div>
      </div>
    </div>
  );
}
