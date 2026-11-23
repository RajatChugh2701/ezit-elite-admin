"use client";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export type Choice = { label: string; value: string };
type Props = { value: string; options: Choice[]; onChange(value: string): void; placeholder?: string; disabled?: boolean; ariaLabel?: string };
const EMPTY = "__ezit_empty_value__";

export function SelectField({ value, options, onChange, placeholder = "Select…", disabled, ariaLabel }: Props) {
  return <Select.Root value={value || EMPTY} onValueChange={(v) => onChange(v === EMPTY ? "" : v)} disabled={disabled}>
    <Select.Trigger className="select-trigger" aria-label={ariaLabel}>
      <Select.Value placeholder={placeholder} /><Select.Icon><ChevronDown size={16} /></Select.Icon>
    </Select.Trigger>
    <Select.Portal><Select.Content className="select-content" position="popper" sideOffset={5}>
      <Select.ScrollUpButton className="select-scroll"><ChevronUp size={15}/></Select.ScrollUpButton>
      <Select.Viewport className="select-viewport">
        <Select.Item className="select-item" value={EMPTY}><Select.ItemText>{placeholder}</Select.ItemText></Select.Item>
        {options.filter((o) => o.value !== "").map((o) => <Select.Item className="select-item" key={o.value} value={o.value}>
          <Select.ItemText>{o.label}</Select.ItemText><Select.ItemIndicator className="select-check"><Check size={15}/></Select.ItemIndicator>
        </Select.Item>)}
      </Select.Viewport>
      <Select.ScrollDownButton className="select-scroll"><ChevronDown size={15}/></Select.ScrollDownButton>
    </Select.Content></Select.Portal>
  </Select.Root>;
}
