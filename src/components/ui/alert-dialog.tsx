import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import { cn } from '@/lib/utils.ts';
import { buttonVariants } from '@/components/ui/button';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { useIsMobile } from '@/hooks/useIsMobile';

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

// Create a context to share swipe state between overlay and content
const SwipeContext = React.createContext<{
  overlayStyle?: React.CSSProperties;
}>({});

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, style, ...props }, ref) => {
  const { overlayStyle } = React.useContext(SwipeContext);

  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      style={{
        touchAction: 'none',
        ...overlayStyle,
        ...style,
      }}
      {...props}
      ref={ref}
    />
  );
});
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    onOpenChange?: (open: boolean) => void;
  }
>(({ className, children, onOpenChange, style, ...props }, ref) => {
  const isMobile = useIsMobile();

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragStyle,
    overlayStyle,
  } = useSwipeToClose({
    onClose: () => onOpenChange?.(false),
    threshold: 100,
    enabled: isMobile,
  });

  return (
    <SwipeContext.Provider value={{ overlayStyle }}>
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
          ref={ref}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={cn(
            'fixed z-50 grid w-full gap-4 border bg-background shadow-lg duration-200',
            // Mobile: drawer from bottom with rounded top corners
            'bottom-0 left-0 right-0 rounded-t-[20px] p-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: centered modal
            'sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:right-auto',
            'sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%]',
            'sm:rounded-lg',
            'sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
            'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]',
            'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
            className,
          )}
          style={{
            ...dragStyle,
            ...style,
          }}
          {...props}
        >
          {/* Mobile drag handle */}
          <div className="flex justify-center -mt-3 mb-1 sm:hidden" data-drag-handle>
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
          </div>
          {children}
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </SwipeContext.Provider>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className,
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-xl font-semibold', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: 'outline' }),
      'mt-2 sm:mt-0',
      className,
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
