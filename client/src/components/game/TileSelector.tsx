import React from 'react';
import { TILES } from '../../../../../project/src/assets/tileset';

interface TileSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'floor' | 'wall', variant: number) => void;
}

export function TileSelector({ isOpen, onClose, onSelect }: TileSelectorProps) {
  if (!isOpen) return null;

  const tileSize = 48;
  const padding = 8;
  const columns = 4;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select Tile</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Floors</h3>
            <div 
              className="grid grid-cols-4 gap-2 p-2 bg-gray-100 rounded"
              style={{
                width: (tileSize + padding * 2) * columns,
              }}
            >
              {TILES.FLOORS.map((tile, index) => (
                <div
                  key={`floor-${index}`}
                  className="relative cursor-pointer hover:ring-2 hover:ring-blue-500 rounded"
                  onClick={() => {
                    onSelect('floor', index);
                    onClose();
                  }}
                >
                  <div 
                    className="w-12 h-12 bg-cover"
                    style={{
                      backgroundImage: `url(https://i.imgur.com/FBvng3a.png)`,
                      backgroundPosition: `-${tile.x}px -${tile.y}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Walls</h3>
            <div 
              className="grid grid-cols-4 gap-2 p-2 bg-gray-100 rounded"
              style={{
                width: (tileSize + padding * 2) * columns,
              }}
            >
              {TILES.WALLS.map((tile, index) => (
                <div
                  key={`wall-${index}`}
                  className="relative cursor-pointer hover:ring-2 hover:ring-blue-500 rounded"
                  onClick={() => {
                    onSelect('wall', index);
                    onClose();
                  }}
                >
                  <div 
                    className="w-12 h-12 bg-cover"
                    style={{
                      backgroundImage: `url(https://i.imgur.com/FBvng3a.png)`,
                      backgroundPosition: `-${tile.x}px -${tile.y}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Decorations</h3>
            <div 
              className="grid grid-cols-4 gap-2 p-2 bg-gray-100 rounded"
              style={{
                width: (tileSize + padding * 2) * columns,
              }}
            >
              {TILES.DECORATIONS.map((tile, index) => (
                <div
                  key={`decoration-${index}`}
                  className="relative cursor-pointer hover:ring-2 hover:ring-blue-500 rounded"
                  onClick={() => {
                    onSelect('floor', index + TILES.FLOORS.length);
                    onClose();
                  }}
                >
                  <div 
                    className="w-12 h-12 bg-cover"
                    style={{
                      backgroundImage: `url(https://i.imgur.com/FBvng3a.png)`,
                      backgroundPosition: `-${tile.x}px -${tile.y}px`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}