import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { SettingsProvider } from './store/SettingsContext';
import { DataProvider } from './store/DataContext';
import { ToastProvider } from './store/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <DataProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DataProvider>
    </SettingsProvider>
  </StrictMode>,
);
