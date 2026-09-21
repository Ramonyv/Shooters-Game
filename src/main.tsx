import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

// WebKit is much more expensive than Chromium when animating masks and many
// independently transformed SVG descendants. Scope the lighter rendering
// path to Safari so other browsers retain the full effect density.
const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);
if (isSafari) document.documentElement.classList.add('is-safari');

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
