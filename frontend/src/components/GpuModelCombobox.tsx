import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GPU_CATALOG, type GpuCatalogEntry } from "@/lib/gpuCatalog";
import { cn } from "@/lib/utils";

export function GpuModelCombobox({
  name,
  ariaLabel,
  onSelectKnown,
  onCustomName,
}: {
  name: string | null;
  ariaLabel: string;
  onSelectKnown: (entry: GpuCatalogEntry) => void;
  onCustomName: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className="flex-1 justify-between font-normal text-text-primary"
        >
          <span className="truncate">{name || "Select or type a GPU model…"}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search GPU model…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary"
                onClick={() => {
                  onCustomName(query.trim());
                  setOpen(false);
                }}
                disabled={query.trim() === ""}
              >
                {query.trim() === ""
                  ? "Type a GPU name, or enter VRAM manually below"
                  : `Use "${query.trim()}" — enter VRAM manually`}
              </button>
            </CommandEmpty>
            <CommandGroup>
              {GPU_CATALOG.map((gpu) => (
                <CommandItem
                  key={gpu.name}
                  value={gpu.name}
                  onSelect={() => {
                    onSelectKnown(gpu);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", name === gpu.name ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{gpu.name}</span>
                  <span className="text-xs text-text-secondary">{gpu.vramGb} GB</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
