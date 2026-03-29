import { type Component, type ComponentProps, createContext, type Snippet } from 'svelte';
import type { Tooltip } from 'layerchart';

export const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = Record<
  string,
  {
    label?: string;
    icon?: Component;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

export type ExtractSnippetParams<T> = T extends Snippet<[infer P]> ? P : never;

export type TooltipPayload = ExtractSnippetParams<
  ComponentProps<typeof Tooltip.Root>['children']
>['payload'][number];

// Helper to extract item config from a payload.
export function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: TooltipPayload | undefined,
  key: string,
) {
  if (typeof payload !== 'object' || payload === null) return;

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let payloadPayload: TooltipPayload['payload'];
  if ('payload' in payload && typeof payload.payload === 'object' && payload.payload !== null)
    payloadPayload = payload.payload;

  let configLabelKey = key;
  if (payload.key === key) configLabelKey = payload.key;
  else if (payload.name === key) configLabelKey = payload.name;
  else if (key in payload && typeof payload[key as keyof typeof payload] === 'string')
    configLabelKey = payload[key as keyof typeof payload] as string;
  else if (
    typeof payloadPayload !== 'undefined' &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  )
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

interface ChartContextValue {
  config: ChartConfig;
}

const [useChart, setContext] = createContext<ChartContextValue>();

export function setChartContext(value: ChartContextValue) {
  return setContext(value);
}

export { useChart };
