import { useState, useEffect } from 'react';

export interface InstructionConfig {
  id: string;
  title: string;
  content: string;
  page?: string;
}

export function useInstructions() {
  const [dismissedInstructions, setDismissedInstructions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed instructions from localStorage on mount
    const dismissed = localStorage.getItem('dismissedInstructions');
    if (dismissed) {
      setDismissedInstructions(new Set(JSON.parse(dismissed)));
    }
  }, []);

  const dismissInstruction = (instructionId: string) => {
    const newDismissed = new Set(dismissedInstructions);
    newDismissed.add(instructionId);
    setDismissedInstructions(newDismissed);
    localStorage.setItem('dismissedInstructions', JSON.stringify(Array.from(newDismissed)));
  };

  const isInstructionDismissed = (instructionId: string) => {
    return dismissedInstructions.has(instructionId);
  };

  const resetInstructions = () => {
    setDismissedInstructions(new Set());
    localStorage.removeItem('dismissedInstructions');
  };

  const shouldShowInstructions = (pageId: string) => {
    return !dismissedInstructions.has(pageId);
  };

  const dismissInstructions = (pageId: string) => {
    dismissInstruction(pageId);
  };

  return {
    dismissInstruction,
    isInstructionDismissed,
    resetInstructions,
    shouldShowInstructions,
    dismissInstructions,
  };
}