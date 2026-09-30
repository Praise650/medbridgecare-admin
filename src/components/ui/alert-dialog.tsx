import * as React from "react";
import * as D from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export const AlertDialog = D.Root;
export const AlertDialogTrigger = D.Trigger;
export const AlertDialogTitle = D.Title;
export const AlertDialogDescription = D.Description;

export const AlertDialogContent = ({ className, ...props }: React.ComponentProps<typeof D.Content>) => (
  <D.Portal>
    <D.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <D.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border bg-background p-6 shadow-lg",
        className,
      )}
      {...props}
    />
  </D.Portal>
);

export const AlertDialogCancel = ({ className, ...props }: React.ComponentProps<typeof D.Cancel>) => (
  <D.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />
);
export const AlertDialogAction = ({ className, ...props }: React.ComponentProps<typeof D.Action>) => (
  <D.Action className={cn(buttonVariants({ variant: "destructive" }), className)} {...props} />
);
