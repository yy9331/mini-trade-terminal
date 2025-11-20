import { ReactNode } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraggableWindow } from "@/hooks/use-draggable-window";

interface DraggableWindowProps {
  children: ReactNode;
  title?: string;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onClose?: () => void;
  className?: string;
}

export function DraggableWindow({
  children,
  title,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 600 },
  minWidth = 300,
  minHeight = 400,
  onDragStart,
  onDragEnd,
  onClose,
  className,
}: DraggableWindowProps) {
  const {
    windowRef,
    position,
    size,
    isDragging,
    isMaximized,
    handleHeaderMouseDown,
    handleResizeMouseDown,
    handleMaximize,
  } = useDraggableWindow({
    initialPosition,
    initialSize,
    minWidth,
    minHeight,
    onDragStart,
    onDragEnd,
  });

  return (
    <div
      ref={windowRef}
      className={cn(
        "fixed bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50",
        "select-none",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMaximized ? "100vw" : `${size.width}px`,
        height: isMaximized ? "100vh" : `${size.height}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className={cn(
          "flex items-center justify-between px-4 py-2 border-b border-border",
          "cursor-grab active:cursor-grabbing",
          "bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {title && (
            <h3 className="text-sm font-semibold truncate">{title}</h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMaximize}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4" style={{ cursor: "default" }}>
        {children}
      </div>

      {/* Resize Handle */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          style={{
            background: "linear-gradient(-45deg, transparent 0%, transparent 30%, hsl(var(--border)) 30%, hsl(var(--border)) 35%, transparent 35%, transparent 65%, hsl(var(--border)) 65%, hsl(var(--border)) 70%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}

