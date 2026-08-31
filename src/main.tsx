import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/base.css';
import { DevApp } from './ui/DevApp';
import { Editor } from './ui/Editor';
import { startAppearance } from './store/appearance';
import { registerServiceWorker } from './pwa/register';

const stopAppearance = startAppearance();
registerServiceWorker();
if (import.meta.hot) import.meta.hot.dispose(stopAppearance);

const container = document.getElementById('root');
if (container === null) throw new Error('Élément racine introuvable.');

createRoot(container).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has('fixtures') ? <DevApp /> : <Editor />}
  </StrictMode>,
);
