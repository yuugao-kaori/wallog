'use client'

import { ThemeProvider as NextThemeProvider } from "./ThemeProvider";
import { ThemeProvider as ThemeContextProvider } from "./ThemeContext";
import NotificationButton from "./NotificationButton";
import ThemeButton from "./ThemeButton";
import NavBar from "./NavBar";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider>
      <ThemeContextProvider>
        <NavBar />
        <div>
          <NotificationButton />
          <ThemeButton />
          {children}
        </div>
      </ThemeContextProvider>
    </NextThemeProvider>
  );
}