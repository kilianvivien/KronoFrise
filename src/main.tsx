import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/base.css';
import { DevApp } from './ui/DevApp';
import { Editor } from './ui/Editor';

const container = document.getElementById('root');
if (container === null) throw new Error('Élément racine introuvable.');

createRoot(container).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has('fixtures') ? <DevApp /> : <Editor />}
  </StrictMode>,
);
