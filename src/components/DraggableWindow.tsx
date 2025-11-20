import { useState, useRef, useEffect, ReactNode } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [prevPosition, setPrevPosition] = useState(initialPosition);
  const [prevSize, setPrevSize] = useState(initialSize);

  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (typeof window === 'undefined') return;
      
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Keep window within viewport bounds
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - (isMaximized ? 0 : size.height);
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
        const newHeight = Math.max(minHeight, resizeStart.height + deltaY);
        
        // Ensure window doesn't exceed viewport bounds
        const maxWidth = window.innerWidth - position.x;
        const maxHeight = window.innerHeight - position.y;
        
        setSize({
          width: Math.min(newWidth, maxWidth),
          height: Math.min(newHeight, maxHeight),
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onDragEnd?.();
      }
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size, position, minWidth, minHeight, isMaximized, onDragEnd]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      onDragStart?.();
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) return;
    
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
    setIsResizing(true);
  };

  const handleMaximize = () => {
    if (typeof window === 'undefined') return;
    
    if (isMaximized) {
      // Restore previous position and size
      setPosition(prevPosition);
      setSize(prevSize);
      setIsMaximized(false);
    } else {
      // Save current position and size
      setPrevPosition(position);
      setPrevSize(size);
      // Maximize window
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
  };

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
        ref={headerRef}
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

