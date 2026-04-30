import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

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
  const t = useTranslations('Game.result');

  const getTitle = () => {
    return type === 'success' ? t('successTitle') : t('failureTitle');
  };

  const getDescription = () => {
    if (type === 'success' && attempts) {
      return t('successDescription', { attempts });
    }
    if (type === 'failure' && targetWord) {
      return t('failureDescription', { answer: targetWord.toUpperCase() });
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
            {t('playAgain')}
          </Button>
          <Button onClick={handleBackToDeck} variant="outline" size="lg" className="w-full">
            {t('backToDeck')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
