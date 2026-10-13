import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApplicationServices } from './application/ApplicationServices';
import { ServicesProvider } from './ui/components/ServicesProvider';

const services = new ApplicationServices();
const root = document.getElementById('root');
if (!root) throw new Error('Required React root is missing.');
// Wait for interception so the very first request also uses the published mocks.
void services.network
  .start()
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <QueryClientProvider client={services.queryClient}>
          <ServicesProvider services={services}>
            <App />
          </ServicesProvider>
        </QueryClientProvider>
      </StrictMode>,
    );
  })
  .catch(() => {
    root.textContent =
      'Unable to initialize the demo network. Please allow service workers and reload this page.';
    root.setAttribute('role', 'alert');
  });
