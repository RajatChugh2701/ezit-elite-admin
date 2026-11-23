"use client";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import type { Choice } from "./select-field";

type Props = { value: string; options: Choice[]; onChange(value: string): void; placeholder?: string; searchPlaceholder?: string; disabled?: boolean; allowClear?: boolean };
export function SearchableSelect({value,options,onChange,placeholder="Choose an option…",searchPlaceholder="Type to search…",disabled,allowClear}:Props){
 const [open,setOpen]=useState(false);const active=options.find(o=>o.value===value);
 return <Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger asChild><button type="button" className="search-select-trigger" disabled={disabled} aria-expanded={open}>
   <span className={active?"":"search-select-placeholder"}>{active?.label||placeholder}</span><ChevronsUpDown size={15}/>
  </button></Popover.Trigger>
  <Popover.Portal><Popover.Content className="search-select-content" align="start" sideOffset={5} onOpenAutoFocus={(e)=>e.preventDefault()}>
   <Command className="command" loop>
    <div className="command-search"><Search size={15}/><Command.Input placeholder={searchPlaceholder} autoFocus /></div>
    <Command.List>
     <Command.Empty className="command-empty">No matching options.</Command.Empty>
     {allowClear&&<Command.Item value="clear selection" onSelect={()=>{onChange("");setOpen(false)}} className="command-item"><span>Clear selection</span></Command.Item>}
     <Command.Group>{options.map(o=><Command.Item key={o.value} value={`${o.label} ${o.value}`} onSelect={()=>{onChange(o.value);setOpen(false)}} className="command-item">
      <span>{o.label}</span>{value===o.value&&<Check size={15} className="command-check"/>}
     </Command.Item>)}</Command.Group>
    </Command.List>
   </Command>
  </Popover.Content></Popover.Portal>
 </Popover.Root>
}
