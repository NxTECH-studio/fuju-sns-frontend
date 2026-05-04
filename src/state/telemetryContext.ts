import { createContext } from "react";
import type { TelemetrySink } from "../services/telemetry";

// null = telemetry disabled (no provider in tree). Hooks treat null
// as "log nothing", same as a no-op sink. This lets prerendering /
// pre-auth screens skip the telemetry stack entirely.
export const TelemetryContext = createContext<TelemetrySink | null>(null);
