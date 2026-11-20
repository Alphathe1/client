import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SiteProvider } from "./context/SiteContext";
import { PreviewBridge } from "./components/site/PreviewBridge";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* "user": slides and layout animations stop for visitors who asked their system for less motion */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ThemeProvider>
          <SiteProvider>
            <PreviewBridge />
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </SiteProvider>
        </ThemeProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
