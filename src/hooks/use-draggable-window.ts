import { useState, useRef, useEffect, useCallback } from "react";

type UseDraggableWindowOptions = {
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

/**
 * Custom hook for managing draggable window state and interactions
 * Handles dragging, resizing, and maximizing window functionality
 */
export const useDraggableWindow = ({
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 600 },
  minWidth = 300,
  minHeight = 400,
  onDragStart,
  onDragEnd,
}: UseDraggableWindowOptions = {}) => {
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

  // Handle mouse move for dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (typeof window === "undefined") return;

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
  }, [
    isDragging,
    isResizing,
    dragStart,
    resizeStart,
    size,
    position,
    minWidth,
    minHeight,
    isMaximized,
    onDragEnd,
  ]);

  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [isMaximized, onDragStart]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMaximized) return;

      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      });
      setIsResizing(true);
    },
    [isMaximized, size]
  );

  const handleMaximize = useCallback(() => {
    if (typeof window === "undefined") return;

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
  }, [isMaximized, position, size, prevPosition, prevSize]);

  return {
    windowRef,
    position,
    size,
    isDragging,
    isResizing,
    isMaximized,
    handleHeaderMouseDown,
    handleResizeMouseDown,
    handleMaximize,
  };
};

