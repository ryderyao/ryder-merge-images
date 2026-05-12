import { twMerge } from "tailwind-merge";

export const cn = (...inputs: Array<string | false | undefined | null>): string =>
  twMerge(inputs.filter(Boolean).join(" "));
