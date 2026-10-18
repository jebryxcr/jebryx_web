import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "./Brand";

const MotionReady = createContext(true);
export const useMotionReady = () => useContext(MotionReady);

/** DOM/CSS port of AppLoadingScreen (3800ms + 650ms) and LoginTransition
 * (700ms entrance, 1400ms hold, 1600ms reveal) in the native application. */
function BrandTransition({
  login = false,
  complete,
}: {
  login?: boolean;
  complete: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onVisibility = () => {
      for (const animation of ref.current?.getAnimations({ subtree: true }) ||
        []) {
        if (document.hidden) animation.pause();
        else animation.play();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return (
    <div
      ref={ref}
      className={`brand-transition ${login ? "login-transition" : "boot-transition"}`}
      role="status"
      aria-label={String(t("intro.preparing"))}
      onAnimationEnd={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.animationName === "boot-exit" || e.animationName === "login-exit")
        )
          complete();
      }}
    >
      {!login && (
        <>
          <img src="/logo-glow.png" className="boot-glow" alt="" />
          <div className="boot-horizon" />
          <div className="boot-landscape" />
          <div className="boot-landscape second" />
          <div className="boot-landscape third" />
        </>
      )}
      <div className="transition-center">
        <div className="transition-emblem">
          <div className="transition-halo" />
          <div className="transition-orbit first">
            <i />
          </div>
          {!login && (
            <div className="transition-orbit second">
              <i />
            </div>
          )}
          {!login &&
            Array.from({ length: 16 }, (_, i) => {
              const angle = (i / 16) * Math.PI * 2;
              const distance = 148 + (i % 4) * 17;
              return (
                <i
                  className="boot-particle"
                  key={i}
                  style={
                    {
                      "--px": `${Math.cos(angle) * distance}px`,
                      "--py": `${Math.sin(angle) * distance}px`,
                      "--delay": `${340 + (i % 5) * 95}ms`,
                      width: i % 3 === 0 ? 4 : 2,
                      height: i % 3 === 0 ? 4 : 2,
                    } as CSSProperties
                  }
                />
              );
            })}
          <div className="transition-logo">
            <Logo size={login ? 118 : 220} />
            <div className="logo-sheen" />
          </div>
        </div>
        <div className="transition-signature">
          <div className="transition-wordmark">
            {"Jebryx".split("").map((letter, i) => (
              <span
                key={i}
                style={
                  { "--letter-delay": `${1450 + i * 95}ms` } as CSSProperties
                }
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="transition-rule" />
          <p>{String(t(login ? "intro.preparing" : "intro.tagline"))}</p>
        </div>
      </div>
      {!login && (
        <div className="transition-footer">
          <LoadingDots />
          <span>{String(t("intro.preparing"))}</span>
        </div>
      )}
    </div>
  );
}

export function LoadingDots() {
  return (
    <span className="loading-dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
export function MotionRoot({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState(true);
  const [login, setLogin] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const begin = () => setLogin(true);
    window.addEventListener("jebryx:login", begin);
    return () => window.removeEventListener("jebryx:login", begin);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  return (
    <MotionReady.Provider value={!boot && !login}>
      <div inert={boot || login} className={login ? "app-login-reveal" : ""}>
        {children}
      </div>
      {boot && <BrandTransition complete={() => setBoot(false)} />}
      {login && !boot && (
        <BrandTransition login complete={() => setLogin(false)} />
      )}
    </MotionReady.Provider>
  );
}

export function animateTheme(apply: () => void) {
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !document.startViewTransition
  ) {
    apply();
    return;
  }
  const transition = document.startViewTransition(apply);
  void transition.finished.catch(() => {});
}
