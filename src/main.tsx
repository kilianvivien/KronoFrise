import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/base.css';
import { DevApp } from './ui/DevApp';

const container = document.getElementById('root');
if (container === null) throw new Error('Élément racine introuvable.');

createRoot(container).render(
  <StrictMode>
    <DevApp />
  </StrictMode>,
);
