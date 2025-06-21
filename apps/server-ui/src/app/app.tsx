// import styles from './app.module.css';
// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, version } from '../api';
import { useEffect, useState } from 'react';

export function App() {

  const [versionValue, setVersionValue] = useState("");

  const init = async () => {
    const v = await version();
    setVersionValue(v);
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
