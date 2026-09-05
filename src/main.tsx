import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './ui/base.css';
import { DevApp } from './ui/DevApp';
import { Editor } from './ui/Editor';
import { startAppearance } from './store/appearance';
import { registerServiceWorker } from './pwa/register';
import { startInstallPrompt } from './pwa/prompts';

const stopAppearance = startAppearance();
const stopInstallPrompt = startInstallPrompt();
registerServiceWorker();
if (import.meta.hot) import.meta.hot.dispose(() => { stopAppearance(); stopInstallPrompt(); });

const container = document.getElementById('root');
if (container === null) throw new Error('Élément racine introuvable.');

createRoot(container).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has('fixtures') ? <DevApp /> : <Editor />}
    <Analytics />
  </StrictMode>,
);
