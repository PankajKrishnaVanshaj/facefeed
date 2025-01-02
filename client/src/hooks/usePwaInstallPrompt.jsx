import { useEffect } from "react";

function usePwaInstallPrompt() {
  useEffect(() => {
    let deferredPrompt;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPrompt = event;

      setTimeout(() => {
        const installDismissedAt = localStorage.getItem("installDismissedAt");
        const oneHour = 60 * 60 * 1000;

        if (
          deferredPrompt &&
          (!installDismissedAt || Date.now() - installDismissedAt > oneHour)
        ) {
          showInstallPrompt();
        }
      }, 5000);
    };

    const showInstallPrompt = () => {
      const installButton = document.createElement("button");
      installButton.textContent = "Install PK Facefeed";

      // Adjust styles for responsiveness
      installButton.style.cssText = `
        position: fixed; 
        bottom: 20px; 
        right: 20px; 
        padding: 10px 20px; 
        background-color: #181818; 
        color: #fff; 
        border: none; 
        border-radius: 5px; 
        cursor: pointer; 
        z-index: 1000; 
        font-size: 1rem; 
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); 
        max-width: 90%; 
        text-align: center;
      `;

      document.body.appendChild(installButton);

      installButton.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choiceResult = await deferredPrompt.userChoice;

          if (choiceResult.outcome === "accepted") {
            console.log("User accepted the install prompt");
          } else {
            console.log("User dismissed the install prompt");
            localStorage.setItem("installDismissedAt", Date.now());
          }

          deferredPrompt = null;
        }

        document.body.removeChild(installButton);
      });
    };

    const handleAppInstalled = () => {
      console.log("PWA was installed");
      deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);
}

export default usePwaInstallPrompt;
