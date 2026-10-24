import type { ComponentProps } from "react";
import { Input } from "./input";

/** Native date control: accessible, keyboard friendly, no calendar dependency. Value is YYYY-MM-DD. */
export function DatePicker(props: Omit<ComponentProps<typeof Input>, "type">) {
  return <Input type="date" {...props} />;
}
