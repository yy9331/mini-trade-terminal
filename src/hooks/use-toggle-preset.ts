import { useState, useCallback } from "react";

/**
 * Custom hook for toggle preset selection
 * Allows selecting and deselecting preset values with a single click
 */
export const useTogglePreset = <T extends string | number>(
  initialValue: string = ""
) => {
  const [value, setValue] = useState<string>(initialValue);

  const togglePreset = useCallback(
    (preset: T) => {
      const presetString = preset.toString();
      // Toggle: if already selected, deselect; otherwise select
      if (value === presetString) {
        setValue("");
      } else {
        setValue(presetString);
      }
    },
    [value]
  );

  const setPreset = useCallback((preset: T) => {
    setValue(preset.toString());
  }, []);

  const clearPreset = useCallback(() => {
    setValue("");
  }, []);

  return {
    value,
    setValue,
    togglePreset,
    setPreset,
    clearPreset,
  };
};

