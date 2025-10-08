import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GameResultType = 'success' | 'failure';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: GameResultType;
  attempts?: number;
  targetWord?: string;
  onRestart: () => void;
}

export function GameResultModal({
  isOpen,
  onClose,
  type,
  attempts,
  targetWord,
  onRestart
}: GameResultModalProps) {
  const getTitle = () => {
    return type === 'success' ? '축하합니다!' : '아쉽습니다';
  };

  const getDescription = () => {
    if (type === 'success' && attempts) {
      return `${attempts}번째 시도에 성공했습니다!`;
    }
    if (type === 'failure' && targetWord) {
      return `정답은 ${targetWord.toUpperCase()}였습니다.`;
    }
    return '';
  };

  const handleRestart = () => {
    onRestart();
    onClose();
  };

  const handleBackToDeck = () => {
    window.history.back();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-center">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={handleRestart} size="lg" className="w-full">
            다시 플레이
          </Button>
          <Button onClick={handleBackToDeck} variant="outline" size="lg" className="w-full">
            덱으로 돌아가기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
