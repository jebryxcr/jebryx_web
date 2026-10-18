import { useLayoutEffect, useRef, useState, type ComponentType } from "react";
import {
  GoogleLogin,
  GoogleOAuthProvider,
  type GoogleLoginProps,
} from "@react-oauth/google";
import { GOOGLE_WEB_CLIENT_ID } from "@/lib/config";
import { useResolvedTheme } from "@/lib/hooks";
import { usePrefs } from "@/lib/store";

// GIS supports outline_dark and button_auto_select; the React wrapper's
// published types do not yet include these documented options.
const GoogleIdentityButton = GoogleLogin as ComponentType<
  Omit<GoogleLoginProps, "theme"> & {
    theme: "outline" | "outline_dark";
    button_auto_select: boolean;
  }
>;

type Props = Pick<GoogleLoginProps, "onSuccess" | "onError"> & {
  busy: boolean;
};

export function GoogleSignInButton({ busy, onSuccess, onError }: Props) {
  const { prefs } = usePrefs();
  const theme = useResolvedTheme();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () =>
      setWidth(Math.min(400, Math.floor(element.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="google-button"
      ref={container}
      inert={busy}
      aria-busy={busy}
    >
      <GoogleOAuthProvider
        key={prefs.language}
        clientId={GOOGLE_WEB_CLIENT_ID}
        locale={prefs.language}
        onScriptLoadError={onError}
      >
        {width > 0 && (
          <GoogleIdentityButton
            type="standard"
            theme={theme === "dark" ? "outline_dark" : "outline"}
            size="large"
            shape="pill"
            text="continue_with"
            logo_alignment="left"
            width={width}
            use_fedcm_for_button
            button_auto_select={false}
            onSuccess={onSuccess}
            onError={onError}
          />
        )}
      </GoogleOAuthProvider>
    </div>
  );
}
