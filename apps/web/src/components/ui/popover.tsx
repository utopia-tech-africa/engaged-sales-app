"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "@/lib/utils";

const Popover = (props: React.ComponentProps<typeof PopoverPrimitive.Root>): React.ReactElement => {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
};

const PopoverTrigger = (
  props: React.ComponentProps<typeof PopoverPrimitive.Trigger>
): React.ReactElement => {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
};

const PopoverAnchor = (
  props: React.ComponentProps<typeof PopoverPrimitive.Anchor>
): React.ReactElement => {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
};

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "relative z-[1200] w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
