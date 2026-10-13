import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './data/api';
import { startNetwork } from './data/network';

const root = document.getElementById('root');
if (!root) throw new Error('Required React root is missing.');
// Wait for interception so the very first request also uses the published mocks.
void startNetwork().then(() => {
  createRoot(root).render(<StrictMode><QueryClientProvider client={queryClient}><App /></QueryClientProvider></StrictMode>);
}).catch(() => {
  root.textContent = 'Unable to initialize the demo network. Please allow service workers and reload this page.';
  root.setAttribute('role', 'alert');
});
