import React from 'react';

interface StatusWindowProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export function StatusWindow({ isOpen, onClose, position }: StatusWindowProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed bg-white rounded-lg shadow-lg p-4 border border-gray-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -120%)',
        zIndex: 1000
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Player Status</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <p className="text-gray-900">Hero</p>
      </div>
    </div>
  );
}