// import styles from './app.module.css';
// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, version } from '../api';
import { useEffect, useState } from 'react';
import { showNotification } from '@mantine/notifications';

export function App() {

  const [versionValue, setVersionValue] = useState("");

  const init = async () => {
    try {
      const v = await version();
      setVersionValue(v);
    } catch (e) {
      showNotification({
        color: "red",
        title: "Error",
        message: `${e}`
      })
    }
  }

  useEffect(() => {
    init();
  }, []);

  return <MantineProvider>
    <QueryClientProvider client={queryClient}>
      <div>
        Hello World!
      </div>
      <div>V{versionValue}</div>
    </QueryClientProvider>
  </MantineProvider>
}

export default App;
