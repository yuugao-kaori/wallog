'use client'

import { memo } from 'react';
import { ThemeProvider } from "./ThemeProvider";
import NavBar from "./NavBar";

const ClientWrapper = memo(function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NavBar />
      <div>
        {children}
      </div>
    </ThemeProvider>
  );
});

export default ClientWrapper;