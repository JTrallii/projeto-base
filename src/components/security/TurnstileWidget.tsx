"use client";

import Script from "next/script";
import {
  useCallback,
  useEffect,
  useRef,
} from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";

      callback: (
        token: string,
      ) => void;

      "expired-callback"?: () => void;

      "error-callback"?: () => void;
    },
  ) => string;

  reset: (
    widgetId?: string,
  ) => void;

  remove: (
    widgetId: string,
  ) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  onTokenChange: (
    token: string | null,
  ) => void;

  resetSignal?: number;

  theme?: "light" | "dark" | "auto";
};

export default function TurnstileWidget({
  onTokenChange,
  resetSignal = 0,
  theme = "dark",
}: TurnstileWidgetProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const widgetIdRef =
    useRef<string | null>(null);

  const onTokenChangeRef =
    useRef(onTokenChange);

  const siteKey =
    process.env
      .NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onTokenChangeRef.current =
      onTokenChange;
  }, [onTokenChange]);

  const renderWidget =
    useCallback(() => {
      if (
        !siteKey ||
        !window.turnstile ||
        !containerRef.current ||
        widgetIdRef.current
      ) {
        return;
      }

      widgetIdRef.current =
        window.turnstile.render(
          containerRef.current,
          {
            sitekey: siteKey,
            theme,

            callback(token) {
              onTokenChangeRef.current(
                token,
              );
            },

            "expired-callback"() {
              onTokenChangeRef.current(
                null,
              );
            },

            "error-callback"() {
              onTokenChangeRef.current(
                null,
              );
            },
          },
        );
    }, [siteKey, theme]);

  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  useEffect(() => {
    if (
      resetSignal === 0 ||
      !widgetIdRef.current ||
      !window.turnstile
    ) {
      return;
    }

    window.turnstile.reset(
      widgetIdRef.current,
    );

    onTokenChangeRef.current(null);
  }, [resetSignal]);

  useEffect(() => {
    return () => {
      if (
        widgetIdRef.current &&
        window.turnstile
      ) {
        window.turnstile.remove(
          widgetIdRef.current,
        );
      }
    };
  }, []);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />

      <div
        ref={containerRef}
        className="flex justify-center"
      />
    </>
  );
}