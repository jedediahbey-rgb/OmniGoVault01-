import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef(null);
  
  // Combine refs
  React.useImperativeHandle(ref, () => contentRef.current);
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        className={cn(
          "fixed left-1/2 top-[10dvh] z-50 grid w-[95%] max-w-lg -translate-x-1/2 max-h-[85dvh] overflow-y-auto gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
          className
        )}
        onPointerDownOutside={(e) => {
          // Check if the click is on a select dropdown (portaled outside dialog)
          const target = e.target;
          const isSelectContent = target?.closest('[data-radix-select-content]') || 
                                  target?.closest('[role="listbox"]') ||
                                  target?.closest('[data-radix-select-viewport]');
          
          // If clicking on select content, prevent dialog close - let select handle it
          if (isSelectContent) {
            e.preventDefault();
            return;
          }
          
          // Check if clicking on the overlay (black area) - allow close
          const isOverlay = target?.closest('[data-radix-dialog-overlay]') ||
                           target?.getAttribute?.('data-radix-dialog-overlay') !== undefined;
          
          if (isOverlay) {
            // Allow dialog to close when clicking overlay
            return;
          }
          
          // For any other outside click, prevent close
          // User must use X button or Escape to close
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // Same logic for interact outside
          const target = e.target;
          const isSelectContent = target?.closest('[data-radix-select-content]') || 
                                  target?.closest('[role="listbox"]');
          const isOverlay = target?.closest('[data-radix-dialog-overlay]');
          
          if (isSelectContent) {
            e.preventDefault();
            return;
          }
          
          if (isOverlay) {
            return; // Allow close on overlay click
          }
          
          e.preventDefault();
        }}
        {...props}>
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" weight="duotone" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
