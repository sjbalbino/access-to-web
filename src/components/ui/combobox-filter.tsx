import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export interface ComboboxFilterOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ComboboxFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxFilterOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allLabel?: string;
  className?: string;
  popoverWidth?: string;
  disabled?: boolean;
}

export function ComboboxFilter({
  value,
  onValueChange,
  options,
  placeholder = "Todos",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado encontrado.",
  allLabel = "Todos",
  className,
  popoverWidth = "w-[300px]",
  disabled = false,
}: ComboboxFilterProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = value
    ? options.find(o => o.value === value)?.label || placeholder
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(popoverWidth, "p-0")}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onValueChange(''); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </CommandItem>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => { onValueChange(option.value); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div>
                    <span>{option.label}</span>
                    {option.sublabel && <span className="text-xs text-muted-foreground ml-2">{option.sublabel}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
