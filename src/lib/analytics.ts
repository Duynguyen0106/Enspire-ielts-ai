"use client";

type Props = { event: string; properties?: Record<string, unknown> };

export function trackClient({ event, properties }: Props) {
  try {
    const ph = (
      window as unknown as {
        posthog?: { capture: (e: string, p?: Record<string, unknown>) => void };
      }
    ).posthog;
    ph?.capture(event, properties);
  } catch {
    // ignore
  }
}
