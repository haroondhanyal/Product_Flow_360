'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Compass, ArrowUpRight } from 'lucide-react';
import './delivery-guide-shortcut.css';

export function DeliveryGuideShortcut() {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => { setRoot(document.querySelector('.sidebar-bottom')); }, []);
  if (!root) return null;
  return createPortal(<button className="delivery-guide-shortcut nav-item" type="button" onClick={() => window.dispatchEvent(new Event('pf360-open-command-center'))}><Compass size={18}/><span>Command Center</span><ArrowUpRight size={15}/></button>, root);
}
