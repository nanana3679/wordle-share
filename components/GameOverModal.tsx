"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWord: string;
  onRestart: () => void;
}

export function GameOverModal({
  isOpen,
  onClose,
  targetWord,
  onRestart
}: GameOverModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleRestart = () => {
    onRestart();
    onClose();
  };

  return (
    <>
      <style jsx global>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideIn 0.3s ease;
        }
        
        .modal-header {
          position: relative;
          padding: 24px 24px 0 24px;
        }
        
        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .modal-close:hover {
          background-color: #f3f4f6;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @media (max-width: 480px) {
          .modal-content {
            width: 95%;
            margin: 20px;
          }
          
          .modal-actions {
            flex-direction: column;
          }
        }
      `}</style>
      
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="modal-content">
          <Card>
            <CardHeader className="modal-header">
              <button className="modal-close" onClick={onClose}>
                <X className="h-5 w-5" />
              </button>
              <CardTitle className="text-center text-2xl font-bold">
              아쉽습니다
              </CardTitle>
            </CardHeader>
            
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                정답은 <strong>{targetWord.toUpperCase()}</strong>였습니다.
              </p>
              
              <div className="modal-actions">
                <Button onClick={handleRestart} size="lg">
                  다시 플레이
                </Button>
                <Button onClick={() => window.history.back()} variant="outline" size="lg">
                  덱으로 돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
