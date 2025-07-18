import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Info } from "lucide-react";
import { useInstructions } from "@/hooks/useInstructions";

interface InstructionBoxProps {
  id: string;
  title: string;
  content: string;
  className?: string;
}

export default function InstructionBox({ id, title, content, className }: InstructionBoxProps) {
  const { dismissInstruction, isInstructionDismissed } = useInstructions();

  if (isInstructionDismissed(id)) {
    return null;
  }

  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-blue-900 text-sm font-medium">
              {title}
            </AlertTitle>
            <AlertDescription className="text-blue-800 text-sm mt-1">
              {content}
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dismissInstruction(id)}
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}