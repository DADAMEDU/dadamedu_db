import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive ref={ref} className={cn("flex w-full flex-col", className)} {...props} />
));
Command.displayName = "Command";

export function CommandInput({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3">
      <Search className="h-4 w-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        className={cn(
          "flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground",
          className
        )}
        {...props}
      />
    </div>
  );
}

export const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-64 overflow-y-auto p-1", className)}
    {...props}
  />
));
CommandList.displayName = "CommandList";

export function CommandEmpty(props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className="py-6 text-center text-sm text-muted-foreground"
      {...props}
    />
  );
}

export const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-[selected=true]:bg-accent",
      className
    )}
    {...props}
  />
));
CommandItem.displayName = "CommandItem";
