'use client'

import { memo } from 'react';
import { ThemeProvider } from "next-themes";
import { ThemeProvider as ThemeContextProvider } from "./ThemeContext";
import ThemeButton from "./ThemeButton";
import NavBar from "./NavBar";

const ClientWrapper = memo(function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeContextProvider>
        <NavBar />
        <div>
          <ThemeButton />
          {children}
        </div>
      </ThemeContextProvider>
    </ThemeProvider>
  );
});

export default ClientWrapper;