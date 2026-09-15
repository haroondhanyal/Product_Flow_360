'use client';

import { useEffect, useState } from 'react';
import { Check, Circle, Moon, Palette, Sun, Waves } from 'lucide-react';

const themes = [
  { id: 'emerald', name: 'PTCL Emerald', description: 'A fresh, focused workspace in signature green.', icon: Sun },
  { id: 'ocean', name: 'Ocean Blue', description: 'Cool blues for a calm, clear view of your work.', icon: Waves },
  { id: 'gray', name: 'Slate Gray', description: 'A neutral, low-distraction workspace for dense delivery work.', icon: Circle },
  { id: 'dark', name: 'Midnight', description: 'A dark workspace with soft emerald accents.', icon: Moon },
  { id: 'violet', name: 'Violet Focus', description: 'A refined violet palette for planning and review work.', icon: Circle },
  { id: 'ruby', name: 'Ruby Signal', description: 'A warm, high-clarity palette for fast triage.', icon: Sun },
  { id: 'contrast-light', name: 'High Contrast Light', description: 'Maximum light-mode contrast for readability and focus.', icon: Waves },
  { id: 'contrast-dark', name: 'High Contrast Dark', description: 'Maximum dark-mode contrast with strong focus states.', icon: Moon },
] as const;
export type Theme = typeof themes[number]['id'];
const buttonColours = [{ id: 'green', name: 'Emerald', colour: '#087c59' }, { id: 'blue', name: 'Blue', colour: '#1769b5' }, { id: 'purple', name: 'Purple', colour: '#7758b8' }, { id: 'orange', name: 'Amber', colour: '#bd6a12' }, { id: 'rose', name: 'Rose', colour: '#b63d5e' }] as const;
export type ButtonColour = typeof buttonColours[number]['id'];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('emerald');
  const [buttonColour, setButtonColour] = useState<ButtonColour>('green');
  const [themeError, setThemeError] = useState('');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pf360-theme');
      if (themes.some(theme => theme.id === saved)) {
        setTheme(saved as Theme);
        document.documentElement.dataset.theme = saved!;
      }
      const savedButtonColour = localStorage.getItem('pf360-button-colour');
      if (buttonColours.some(colour => colour.id === savedButtonColour)) { setButtonColour(savedButtonColour as ButtonColour); document.documentElement.dataset.buttonColour = savedButtonColour!; }
    } catch { setThemeError('Theme preferences cannot be saved in this browser.'); }
  }, []);
  function selectTheme(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('pf360-theme', next); setThemeError(''); }
    catch { setThemeError('Theme applied for this session. Browser storage is unavailable.'); }
  }
  function selectButtonColour(next: ButtonColour) { setButtonColour(next); document.documentElement.dataset.buttonColour = next; try { localStorage.setItem('pf360-button-colour', next); setThemeError(''); } catch { setThemeError('Colour applied for this session. Browser storage is unavailable.'); } }
  return { theme, selectTheme, buttonColour, selectButtonColour, themeError };
}

export function ThemeSettings({ theme, onChange, error }: { theme: Theme; onChange: (theme: Theme) => void; error: string }) {
  const { buttonColour, selectButtonColour } = useTheme();
  return <section className="settings-panel">
    <div className="settings-heading"><span className="metric-icon green"><Palette size={22} /></span><div><h2>Make this workspace yours</h2><p>Choose a theme that fits the way you work.</p></div></div>
    <div className="theme-grid" role="group" aria-label="Workspace theme">
      {themes.map(({ id, name, description, icon: Icon }) => <button key={id} type="button" className={`theme-card ${theme === id ? 'chosen' : ''}`}
        aria-pressed={theme === id} onClick={() => onChange(id)}>
        <span className={`theme-preview preview-${id}`} aria-hidden="true"><span className="preview-sidebar"/><span className="preview-body"><i/><span><i/><i/><i/></span><b/><b/></span></span>
        <span className="theme-name"><Icon size={17} /><strong>{name}</strong>{theme === id && <Check size={17} />}</span>
        <span className="theme-description">{description}</span>
      </button>)}
    </div>
    <div className="button-colours" role="group" aria-label="Primary button colour"><div><h3>Primary button colour</h3><p>Apply one accent colour to actions across the workspace.</p></div><div className="colour-options">{buttonColours.map(colour => <button key={colour.id} type="button" className={`colour-option ${buttonColour === colour.id ? 'chosen' : ''}`} aria-label={`${colour.name} button colour`} aria-pressed={buttonColour === colour.id} onClick={() => selectButtonColour(colour.id)}><i style={{ background: colour.colour }} />{buttonColour === colour.id && <Check size={14} />}</button>)}</div></div>
    <section className="profile-settings"><div><h3>Profile & account</h3><p>Update your name, designation, department, email, mobile number and profile picture.</p></div><button className="text-button" type="button" onClick={() => window.dispatchEvent(new Event('pf360-open-profile'))}>Update profile</button></section>
    <p className="settings-note" role="status">{error || `${themes.find(item => item.id === theme)?.name} selected. Your preference is saved on this browser.`}</p>
  </section>;
}
