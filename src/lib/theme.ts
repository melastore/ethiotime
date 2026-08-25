// Not in theme-provider.tsx because layout.tsx (a server component) imports the
// bootstrap script. Values exported from a "use client" file arrive in a server
// component as client references, not the actual value, and putting one in
// dangerouslySetInnerHTML throws "Cannot read properties of undefined (reading
// 'call')" in webpack once it hits the browser.

/** What the user picked. "system" follows the OS. */
export type ThemeChoice = "light" | "dark" | "system";
/** What is actually on screen once "system" has been resolved. */
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ethiotime-theme";

/**
 * Runs in the document head before first paint. The provider applies the same
 * three properties on every change; keep the two in sync or a stored dark choice
 * flashes light on load.
 */
export const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var choice = stored === 'light' || stored === 'dark' ? stored : 'system';
    var resolved =
      choice === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : choice;
    var root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  } catch (error) {
    /* Storage blocked, or no matchMedia: the light default in CSS stands. */
  }
})();
`;
