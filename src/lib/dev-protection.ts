// Developer tools protection
export function enableDevProtection() {
  // Disable right-click context menu (except on admin pages)
  document.addEventListener("contextmenu", (e) => {
    const isAdminPage = window.location.pathname.startsWith("/admin");
    if (!isAdminPage) {
      e.preventDefault();
    }
  });

  // Disable keyboard shortcuts for dev tools
  document.addEventListener("keydown", (e) => {
    // F12
    if (e.key === "F12") {
      e.preventDefault();
      redirectToBlank();
    }
    // Ctrl+Shift+I / Cmd+Option+I
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
      e.preventDefault();
      redirectToBlank();
    }
    // Ctrl+Shift+J / Cmd+Option+J
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") {
      e.preventDefault();
      redirectToBlank();
    }
    // Ctrl+Shift+C / Cmd+Option+C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
      e.preventDefault();
      redirectToBlank();
    }
    // Ctrl+U / Cmd+U (view source)
    if ((e.ctrlKey || e.metaKey) && e.key === "u") {
      e.preventDefault();
      redirectToBlank();
    }
  });

  // Detect dev tools via debugger timing
  const detectDevTools = () => {
    const threshold = 160;
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();
    if (end - start > threshold) {
      console.clear();
      redirectToBlank();
    }
  };

  // Run detection periodically
  setInterval(detectDevTools, 3000);

  // Clear console periodically
  setInterval(() => {
    console.clear();
  }, 1000);
}

function redirectToBlank() {
  console.clear();
  window.location.href = "about:blank";
}
