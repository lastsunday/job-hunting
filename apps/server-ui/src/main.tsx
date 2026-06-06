import 'virtual:uno.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { StrictMode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/zh-cn';
import i18n from './i18n/i18n';
// Import the generated route tree
import { routeTree } from './routeTree.gen';
import { AuthProvider, useAuth } from './hooks/auth';
import { Notifications } from '@mantine/notifications';

function localeMap(lng: string) {
  return lng === 'zh' ? 'zh-cn' : 'en';
}

function DatesProviderWrapper({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState(() => localeMap(i18n.language));
  useEffect(() => {
    const handler = (lng: string) => setLocale(localeMap(lng));
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);
  return (
    <DatesProvider settings={{ locale }}>{children}</DatesProvider>
  );
}

export const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

// Render the app
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <Notifications position="top-right" />
          <DatesProviderWrapper>
            <AuthProvider>
              <InnerApp />
            </AuthProvider>
          </DatesProviderWrapper>
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
