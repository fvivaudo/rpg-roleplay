import React, { useState, useEffect, useCallback, useRef } from 'react';
import { maps, saveMaps } from '../../../../../project/src/maps';
import { TILES } from '../../../../../project/src/assets/tileset';
import { Cell, MapData } from '../../../../../project/src/types';

interface MapEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onMapSelect: (mapName: string) => void;
}

type Tool = 'draw' | 'erase' | 'select';
type TileCategory = 'floor' | 'wall' | 'portal';
type PortalType = 'exit' | 'z1' | 'z2' | 'z3';

interface EditableCell {
  type: 'floor' | 'wall' | string;
  variant?: number;
}

export function MapEditor({ isOpen, onClose, onMapSelect }: MapEditorProps) {
  const [selectedMap, setSelectedMap] = useState('exterior');
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [selectedTileCategory, setSelectedTileCategory] = useState<TileCategory>('floor');
  const [selectedTileVariant, setSelectedTileVariant] = useState(0);
  const [selectedPortalType, setSelectedPortalType] = useState<PortalType>('exit');
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editableMap, setEditableMap] = useState<EditableCell[][]>([]);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const reloadTimeout = useRef<number>();
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleZoom = (delta: number) => {
    setZoom(prevZoom => {
      const newZoom = prevZoom + delta;
      return Math.max(0.5, Math.min(2, newZoom));
    });
  };

  useEffect(() => {
    const mapData = maps[selectedMap as keyof typeof maps];
    if (mapData) {
      setEditableMap(mapData.layout.map(row =>
        row.map(cell => {
          if (typeof cell === 'number') {
            return { type: cell === 1 ? 'wall' : 'floor', variant: 0 };
          }
          return { type: cell };
        })
      ));
    }
  }, [selectedMap]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (hasUnsavedChanges) {
        if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  }, [hasUnsavedChanges, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, handleKeyPress]);

  const handleCellEdit = (x: number, y: number) => {
    if (!isDrawing && currentTool !== 'erase') return;

    const newMap = [...editableMap];
    if (currentTool === 'erase') {
      newMap[y][x] = { type: 'floor', variant: 0 };
    } else {
      if (selectedTileCategory === 'portal') {
        newMap[y][x] = { type: selectedPortalType };
      } else {
        newMap[y][x] = {
          type: selectedTileCategory,
          variant: selectedTileVariant
        };
      }
    }
    setEditableMap(newMap);
    setHasUnsavedChanges(true);
  };

  const reloadMap = useCallback(async () => {
    setIsReloading(true);
    setReloadStatus('idle');

    try {
      // Store current viewport state
      const currentZoom = zoom;
      const currentOffset = { ...mapOffset };

      // Clear any existing reload timeout
      if (reloadTimeout.current) {
        window.clearTimeout(reloadTimeout.current);
      }

      // Reload the map data
      const mapData = maps[selectedMap as keyof typeof maps];
      if (!mapData) throw new Error('Map not found');

      setEditableMap(mapData.layout.map(row =>
        row.map(cell => {
          if (typeof cell === 'number') {
            return { type: cell === 1 ? 'wall' : 'floor', variant: 0 };
          }
          return { type: cell };
        })
      ));

      // Trigger game map reload
      onMapSelect(selectedMap);

      // Show success status briefly
      setReloadStatus('success');
      reloadTimeout.current = window.setTimeout(() => {
        setReloadStatus('idle');
      }, 2000);

      // Restore viewport state
      setZoom(currentZoom);
      setMapOffset(currentOffset);
    } catch (error) {
      console.error('Error reloading map:', error);
      setReloadStatus('error');
      reloadTimeout.current = window.setTimeout(() => {
        setReloadStatus('idle');
      }, 3000);
    } finally {
      setIsReloading(false);
    }
  }, [selectedMap, zoom, mapOffset, onMapSelect]);

  const handleSave = async () => {
    // Convert editable map back to the format expected by the game
    const layout = editableMap.map(row =>
      row.map(cell => {
        if (cell.type === 'wall') return 1;
        if (cell.type === 'floor') return 0;
        return cell.type; // For portals
      })
    );

    // Update the maps object with the new layout
    const updatedMaps = {
      ...maps,
      [selectedMap]: {
        ...maps[selectedMap as keyof typeof maps],
        layout
      }
    };

    try {
      // Save to localStorage
      saveMaps(updatedMaps);
      
      // Reload the map with the new changes
      await reloadMap();
      
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving map:', error);
      setReloadStatus('error');
    }
  };

  const renderCell = (cell: EditableCell, x: number, y: number) => {
    if (typeof cell.type === 'string' && cell.type !== 'floor' && cell.type !== 'wall') {
      return (
        <div
          className="w-12 h-12 border border-gray-300 flex items-center justify-center"
          style={{
            backgroundColor: cell.type === 'exit' ? '#ffcccc' : '#ccffcc'
          }}
        >
          <span className="text-xs font-bold">{cell.type.toUpperCase()}</span>
        </div>
      );
    }

    const tileSet = cell.type === 'wall' ? TILES.WALLS : TILES.FLOORS;
    const tile = tileSet[cell.variant || 0];

    return (
      <div
        className="w-12 h-12 border border-gray-300"
        style={{
          backgroundImage: `url(https://i.imgur.com/FBvng3a.png)`,
          backgroundPosition: `-${tile.x}px -${tile.y}px`,
        }}
      />
    );
  };

  if (!isOpen) return null;

  const mapNames = Object.keys(maps);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Map Editor</h2>
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            {reloadStatus === 'success' && (
              <span className="text-green-500 flex items-center">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Map updated
              </span>
            )}
            {reloadStatus === 'error' && (
              <span className="text-red-500 flex items-center">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                Error updating map
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isReloading}
              className={`px-4 py-2 rounded flex items-center ${
                hasUnsavedChanges && !isReloading
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isReloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button 
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                    onClose();
                  }
                } else {
                  onClose();
                }
              }}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-gray-200 p-4 flex gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentTool('draw')}
              className={`px-3 py-2 rounded ${currentTool === 'draw' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Draw
            </button>
            <button
              onClick={() => setCurrentTool('erase')}
              className={`px-3 py-2 rounded ${currentTool === 'erase' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Erase
            </button>
          </div>

          <div className="border-l border-gray-300 h-8 mx-2" />

          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleZoom(-0.1)}
              className="px-3 py-2 rounded bg-gray-200"
            >
              -
            </button>
            <span className="w-20 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => handleZoom(0.1)}
              className="px-3 py-2 rounded bg-gray-200"
            >
              +
            </button>
          </div>

          <div className="border-l border-gray-300 h-8 mx-2" />

          <select
            value={selectedMap}
            onChange={(e) => {
              if (hasUnsavedChanges) {
                if (window.confirm('You have unsaved changes. Are you sure you want to switch maps?')) {
                  setSelectedMap(e.target.value);
                  setHasUnsavedChanges(false);
                }
              } else {
                setSelectedMap(e.target.value);
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            {mapNames.map(name => (
              <option key={name} value={name}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Tile Palette */}
          <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Tiles</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Floor Tiles</h4>
                <div className="grid grid-cols-4 gap-1">
                  {TILES.FLOORS.map((tile, index) => (
                    <div
                      key={`floor-${index}`}
                      className={`w-12 h-12 border-2 cursor-pointer ${
                        selectedTileCategory === 'floor' && selectedTileVariant === index
                          ? 'border-blue-500'
                          : 'border-transparent'
                      }`}
                      onClick={() => {
                        setSelectedTileCategory('floor');
                        setSelectedTileVariant(index);
                      }}
                      style={{
                        backgroundImage: `url(https://i.imgur.com/FBvng3a.png)`,
                        backgroundPosition: `-${tile.x}px -${tile.y}px`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Wall Tiles</h4>
                <div className="grid grid-cols-4 gap-1">
                  {TILES.WALLS.map((tile, index) => (
                    <div
                      key={`wall-${index}`}
                      className={`w-12 h-12 border-2 cursor-pointer ${
                        selectedTileCategory === 'wall' && selectedTileVariant === index
                          ? 'border-blue-500'
                          : 'border-transparent'
                      }`}
                      onClick={() => {
                        setSelectedTileCategory('wall');
                        setSelectedTileVariant(index);
                      }}
                      style={{
                        backgroundImage: `url(https://i.imgur.com/FBvng3a.png)`,
                        backgroundPosition: `-${tile.x}px -${tile.y}px`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Portals</h4>
                <div className="space-y-2">
                  <button
                    className={`w-full px-3 py-2 text-left rounded ${
                      selectedTileCategory === 'portal' && selectedPortalType === 'exit'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedTileCategory('portal');
                      setSelectedPortalType('exit');
                    }}
                  >
                    Exit Portal
                  </button>
                  {['z1', 'z2', 'z3'].map((zone) => (
                    <button
                      key={zone}
                      className={`w-full px-3 py-2 text-left rounded ${
                        selectedTileCategory === 'portal' && selectedPortalType === zone
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedTileCategory('portal');
                        setSelectedPortalType(zone as PortalType);
                      }}
                    >
                      Zone {zone.slice(1)} Portal
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Map Canvas */}
          <div 
            className="flex-1 relative overflow-hidden bg-gray-100"
            onMouseDown={(e) => {
              if (e.button === 0) { // Left click
                setIsDrawing(true);
              } else {
                setIsDragging(true);
              }
            }}
            onMouseUp={() => {
              setIsDrawing(false);
              setIsDragging(false);
            }}
            onMouseLeave={() => {
              setIsDrawing(false);
              setIsDragging(false);
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setMapOffset({
                  x: mapOffset.x + e.movementX,
                  y: mapOffset.y + e.movementY
                });
              }
            }}
          >
            <div
              className="absolute"
              style={{
                transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${zoom})`,
                transformOrigin: '0 0'
              }}
            >
              <div className="grid grid-cols-16 gap-0">
                {editableMap.map((row, y) => (
                  <div key={y} className="flex">
                    {row.map((cell, x) => (
                      <div
                        key={`${x}-${y}`}
                        onMouseDown={() => handleCellEdit(x, y)}
                        onMouseEnter={(e) => {
                          if (e.buttons === 1) { // Left mouse button
                            handleCellEdit(x, y);
                          }
                        }}
                      >
                        {renderCell(cell, x, y)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}