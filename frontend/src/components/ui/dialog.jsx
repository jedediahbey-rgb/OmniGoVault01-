import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

// Track if a select is currently open globally
let selectOpenCount = 0;

export const registerSelectOpen = () => { selectOpenCount++; };
export const registerSelectClose = () => { selectOpenCount = Math.max(0, selectOpenCount - 1); };
export const isSelectOpen = () => selectOpenCount > 0;

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Helper to check if an element is part of a Radix Select dropdown
 */
const isSelectElement = (target) => {
  if (!target || !(target instanceof Element)) return false;
  
  // Check if target is within select content or is a select trigger
  const selectContent = target.closest('[data-radix-select-content]');
  const selectViewport = target.closest('[data-radix-select-viewport]');
  const selectTrigger = target.closest('[data-radix-select-trigger]');
  const selectItem = target.closest('[data-radix-select-item]');
  const selectPortal = target.closest('[data-radix-popper-content-wrapper]');
  
  return !!(selectContent || selectViewport || selectTrigger || selectItem || selectPortal);
};

const DialogContent = React.forwardRef(({ className, children, onPointerDownOutside, onInteractOutside, ...props }, ref) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[92vw] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg",
          className
        )}
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus to avoid keyboard issues on mobile
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Check if interaction is with a select dropdown (portaled outside dialog)
          const target = e.target;
          if (isSelectElement(target) || isSelectOpen()) {
            e.preventDefault();
            return;
          }
          // ALWAYS prevent closing - user must use X button
          e.preventDefault();
          if (onPointerDownOutside) onPointerDownOutside(e);
        }}
        onInteractOutside={(e) => {
          // Check if interaction is with a select dropdown
          const target = e.target;
          if (isSelectElement(target) || isSelectOpen()) {
            e.preventDefault();
            return;
          }
          // ALWAYS prevent closing - user must use X button
          e.preventDefault();
          if (onInteractOutside) onInteractOutside(e);
        }}
        onFocusOutside={(e) => {
          // Prevent focus outside from closing dialog
          // This is critical for mobile where tapping another input
          // causes focus to change
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent auto-focus on close
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
