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
  { id: 'teal', name: 'Pacific Teal', description: 'A clear teal accent with a bright, balanced canvas.', icon: Waves },
  { id: 'sapphire', name: 'Sapphire', description: 'Confident blue tones for operational work.', icon: Waves },
  { id: 'indigo', name: 'Indigo Night', description: 'A calm indigo interface with crisp contrast.', icon: Moon },
  { id: 'lavender', name: 'Soft Lavender', description: 'A gentle violet palette for focused planning.', icon: Circle },
  { id: 'rose', name: 'Rose Quartz', description: 'Warm rose accents on a clean, light workspace.', icon: Sun },
  { id: 'coral', name: 'Coral Glow', description: 'Energetic coral highlights with soft neutral surfaces.', icon: Sun },
  { id: 'amber', name: 'Golden Hour', description: 'Warm amber accents for a welcoming workspace.', icon: Sun },
  { id: 'forest', name: 'Forest Canopy', description: 'Deep natural greens with a soft, readable canvas.', icon: Circle },
  { id: 'mint', name: 'Mint Fresh', description: 'Fresh mint accents and airy, light surfaces.', icon: Waves },
  { id: 'sand', name: 'Warm Sand', description: 'A refined warm neutral palette for long work sessions.', icon: Sun },
  { id: 'charcoal', name: 'Charcoal', description: 'A dark graphite workspace with cool blue-green accents.', icon: Moon },
  { id: 'arctic', name: 'Arctic Frost', description: 'Cool, crisp surfaces with an icy blue accent.', icon: Waves },
] as const;
export type Theme = typeof themes[number]['id'];
const buttonColours = [
  { id: 'green', name: 'Emerald', colour: '#087c59' }, { id: 'blue', name: 'Ocean', colour: '#1769b5' }, { id: 'royal', name: 'Royal blue', colour: '#3155c6' }, { id: 'indigo', name: 'Indigo', colour: '#5146b8' }, { id: 'violet', name: 'Violet', colour: '#7046b8' },
  { id: 'plum', name: 'Plum', colour: '#8a3d8f' }, { id: 'magenta', name: 'Magenta', colour: '#b83280' }, { id: 'rose', name: 'Rose', colour: '#c43d62' }, { id: 'crimson', name: 'Crimson', colour: '#b8333a' }, { id: 'coral', name: 'Coral', colour: '#d45645' },
  { id: 'tangerine', name: 'Tangerine', colour: '#c05c18' }, { id: 'amber', name: 'Amber', colour: '#a96d0b' }, { id: 'saffron', name: 'Saffron', colour: '#ba8217' }, { id: 'olive', name: 'Olive', colour: '#65751a' }, { id: 'forest', name: 'Forest', colour: '#286b43' },
  { id: 'pine', name: 'Pine', colour: '#24624d' }, { id: 'teal', name: 'Teal', colour: '#087b83' }, { id: 'lagoon', name: 'Lagoon', colour: '#16816d' }, { id: 'cyan', name: 'Cyan', colour: '#087ba6' }, { id: 'azure', name: 'Azure', colour: '#2876d2' },
  { id: 'cobalt', name: 'Cobalt', colour: '#2547a8' }, { id: 'slate', name: 'Slate', colour: '#4e647d' }, { id: 'graphite', name: 'Graphite', colour: '#46515d' }, { id: 'midnight', name: 'Midnight', colour: '#34465f' }, { id: 'copper', name: 'Copper', colour: '#a65333' },
  { id: 'redwood', name: 'Redwood', colour: '#a7462d' }, { id: 'berry', name: 'Berry', colour: '#91365e' }, { id: 'orchid', name: 'Orchid', colour: '#a04cb1' }, { id: 'periwinkle', name: 'Periwinkle', colour: '#626bc5' }, { id: 'mint', name: 'Mint', colour: '#168b74' },
] as const;
export type ButtonColour = typeof buttonColours[number]['id'];
function applyButtonColour(id: ButtonColour) {
  const colour = buttonColours.find(item => item.id === id) ?? buttonColours[0];
  document.documentElement.dataset.buttonColour = id;
  document.documentElement.style.setProperty('--button', colour.colour);
  document.documentElement.style.setProperty('--button-hover', `color-mix(in srgb, ${colour.colour} 78%, #101820)`);
}

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
      const legacyColour: Record<string, ButtonColour> = { blue: 'ocean' as ButtonColour, purple: 'violet' as ButtonColour, orange: 'amber' as ButtonColour };
      const restoredColour = buttonColours.some(colour => colour.id === savedButtonColour) ? savedButtonColour as ButtonColour : legacyColour[savedButtonColour ?? ''];
      if (restoredColour) { setButtonColour(restoredColour); applyButtonColour(restoredColour); }
    } catch { setThemeError('Theme preferences cannot be saved in this browser.'); }
  }, []);
  function selectTheme(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('pf360-theme', next); setThemeError(''); }
    catch { setThemeError('Theme applied for this session. Browser storage is unavailable.'); }
  }
  function selectButtonColour(next: ButtonColour) { setButtonColour(next); applyButtonColour(next); try { localStorage.setItem('pf360-button-colour', next); setThemeError(''); } catch { setThemeError('Colour applied for this session. Browser storage is unavailable.'); } }
  return { theme, selectTheme, buttonColour, selectButtonColour, themeError };
}

export function ThemeSettings({ theme, onChange, error }: { theme: Theme; onChange: (theme: Theme) => void; error: string }) {
  const { buttonColour, selectButtonColour } = useTheme();
  return <section className="settings-panel">
    <div className="settings-heading"><span className="metric-icon green"><Palette size={22} /></span><div><h2>Make this workspace yours</h2><p>Choose from 20 modern themes for your workspace.</p></div></div>
    <div className="theme-grid" role="group" aria-label="Workspace theme">
      {themes.map(({ id, name, description, icon: Icon }) => <button key={id} type="button" className={`theme-card ${theme === id ? 'chosen' : ''}`}
        aria-pressed={theme === id} onClick={() => onChange(id)}>
        <span className={`theme-preview preview-${id}`} aria-hidden="true"><span className="preview-sidebar"/><span className="preview-body"><i/><span><i/><i/><i/></span><b/><b/></span></span>
        <span className="theme-name"><Icon size={17} /><strong>{name}</strong>{theme === id && <Check size={17} />}</span>
        <span className="theme-description">{description}</span>
      </button>)}
    </div>
    <div className="button-colours" role="group" aria-label="Primary button colour"><div><h3>Primary button colour · 30 palettes</h3><p>Tap a named colour to apply it to primary actions across the workspace.</p></div><div className="colour-options">{buttonColours.map(colour => <button key={colour.id} type="button" className={`colour-option ${buttonColour === colour.id ? 'chosen' : ''}`} aria-label={`${colour.name} primary button colour`} title={colour.name} aria-pressed={buttonColour === colour.id} onClick={() => selectButtonColour(colour.id)}><i style={{ background: colour.colour }} />{buttonColour === colour.id && <Check size={14} />}<span>{colour.name}</span></button>)}</div></div>
    <section className="profile-settings"><div><h3>Profile & account</h3><p>Update your name, designation, department, email, mobile number and profile picture.</p></div><button className="text-button" type="button" onClick={() => window.dispatchEvent(new Event('pf360-open-profile'))}>Update profile</button></section>
    <p className="settings-note" role="status">{error || `${themes.find(item => item.id === theme)?.name} selected. Your preference is saved on this browser.`}</p>
  </section>;
}
