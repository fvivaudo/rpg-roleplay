import React, {useState, useEffect, useCallback, useRef} from 'react';
import * as ex from 'excalibur';
import {Engine, Actor, Color, Vector, Sprite, Scene, Input} from 'excalibur';
import {maps, saveMaps} from './maps';
import {TILES, tilesetImage} from './assets/tileset';
import {MapCell, MapData} from '@/types/game';
import {MapEditor} from "@/app/routes/app/mapEditor.ts";
import {Game} from "@/app/routes/app/game.ts";

interface MapEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onMapSelect: (mapName: string) => void;
}

type Tool = 'draw' | 'select';
type TileCategory = 'floor' | 'wall' | 'portal' | 'void';
type PortalType = 'exit' | 'z1' | 'z2' | 'z3';
type Direction = 'top' | 'bottom' | 'left' | 'right';

interface EditableCell {
    type: 'floor' | 'wall' | 'void' | string;
    tileId?: number;
    isPlayable?: boolean;
}

export function MapEditorScreen({isOpen, onClose, onMapSelect}: MapEditorProps) {
    const [activeCell, setActiveCell] = useState([-1, -1]);
    const [selectedMap, setSelectedMap] = useState('exterior');
    const [selectedTileCategory, setSelectedTileCategory] = useState<TileCategory>('floor');
    const [selectedTileVariant, setSelectedTileVariant] = useState(0);
    const [selectedPortalType, setSelectedPortalType] = useState<PortalType>('exit');
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [editableMap, setEditableMap] = useState<EditableCell[][]>([]);
    const [isReloading, setIsReloading] = useState(false);
    const [reloadStatus, setReloadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showMapControls, setShowMapControls] = useState(false);
    const reloadTimeout = useRef<number>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const gridActors = useRef<Actor[][]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const gameEditorRef = useRef<MapEditor | null>(null);

    useEffect(() => {
        if (isOpen) {
            gameEditorRef.current = new MapEditor({canvasId:'gameEditor', mapId:'exterior', setHasUnsavedChanges:setHasUnsavedChanges});
            gameEditorRef.current.start();
        }
        else {
            setHasUnsavedChanges(true)
            gameEditorRef.current?.dispose()
            gameEditorRef.current = null;
        }
    }, [isOpen]);

    // Initialize Excalibur engine for map editor
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;

        const initEngine = async () => {
            if (engineRef.current) {
                engineRef.current.stop();
                engineRef.current = null;
            }

            const mapWidth = editableMap[0]?.length || 16;
            const mapHeight = editableMap.length || 16;
            const cellSize = 48;

            const engine = new Engine({
                width: mapWidth * cellSize,
                height: mapHeight * cellSize,
                backgroundColor: Color.Black,
                canvasElement: canvasRef.current!
            });

            const scene = new Scene();
            engine.addScene('editor', scene);
            await engine.goToScene('editor');

            // Wait for tileset to load
            await tilesetImage.load();

            engineRef.current = engine;
            sceneRef.current = scene;
            createMapGrid();
            await engine.start();
        };

        initEngine().catch(console.error);

        return () => {
            if (engineRef.current) {
                engineRef.current.stop();
                engineRef.current = null;
            }
        };
    }, [isOpen]);

    const handleExpandMap = async (direction: Direction) => {
        if (gameEditorRef.current) {
            await gameEditorRef.current.expandMap(direction);
            setHasUnsavedChanges(true);
        }
    };

    const handleReduceMap = async (direction: Direction) => {
        // Add confirmation for destructive operation
        const confirmMessage = `Remove a ${direction === 'top' || direction === 'bottom' ? 'row' : 'column'} from the ${direction} of the map? This will permanently delete any tiles in that area.`;

        // if (window.confirm(confirmMessage) && gameEditorRef.current) {
        if (gameEditorRef.current) {
            await gameEditorRef.current.reduceMap(direction);
            setHasUnsavedChanges(true);
        }
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
                        {/* Map Size Controls */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMapControls(!showMapControls)}
                                className="px-3 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2"
                                title="Map Size Controls"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                Resize Map
                                <svg className={`w-4 h-4 transform transition-transform ${showMapControls ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Panel */}
                            {showMapControls && (
                                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-10 min-w-[300px]">
                                    <div className="space-y-4">
                                        {/* Expand Controls */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-green-600">Expand Map</h4>
                                            <div className="grid grid-cols-3 gap-2 max-w-[120px] mx-auto">
                                                <div></div>
                                                <button
                                                    onClick={() => handleExpandMap('top')}
                                                    className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 text-sm"
                                                    title="Add row above (Alt+↑)"
                                                >
                                                    ↑
                                                </button>
                                                <div></div>

                                                <button
                                                    onClick={() => handleExpandMap('left')}
                                                    className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 text-sm"
                                                    title="Add column left (Alt+←)"
                                                >
                                                    ←
                                                </button>
                                                <div className="flex items-center justify-center">
                                                    <div className="w-6 h-6 border border-green-300 rounded"></div>
                                                </div>
                                                <button
                                                    onClick={() => handleExpandMap('right')}
                                                    className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 text-sm"
                                                    title="Add column right (Alt+→)"
                                                >
                                                    →
                                                </button>

                                                <div></div>
                                                <button
                                                    onClick={() => handleExpandMap('bottom')}
                                                    className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 text-sm"
                                                    title="Add row below (Alt+↓)"
                                                >
                                                    ↓
                                                </button>
                                                <div></div>
                                            </div>
                                        </div>

                                        {/* Separator */}
                                        <hr className="border-gray-200" />

                                        {/* Reduce Controls */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-red-600">Reduce Map</h4>
                                            <div className="grid grid-cols-3 gap-2 max-w-[120px] mx-auto">
                                                <div></div>
                                                <button
                                                    onClick={() => handleReduceMap('top')}
                                                    className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-sm"
                                                    title="Remove top row (Shift+Alt+↑)"
                                                >
                                                    ↓
                                                </button>
                                                <div></div>

                                                <button
                                                    onClick={() => handleReduceMap('left')}
                                                    className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-sm"
                                                    title="Remove left column (Shift+Alt+←)"
                                                >
                                                    →
                                                </button>
                                                <div className="flex items-center justify-center">
                                                    <div className="w-6 h-6 border border-red-300 rounded"></div>
                                                </div>
                                                <button
                                                    onClick={() => handleReduceMap('right')}
                                                    className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-sm"
                                                    title="Remove right column (Shift+Alt+→)"
                                                >
                                                    ←
                                                </button>

                                                <div></div>
                                                <button
                                                    onClick={() => handleReduceMap('bottom')}
                                                    className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-sm"
                                                    title="Remove bottom row (Shift+Alt+↓)"
                                                >
                                                    ↑
                                                </button>
                                                <div></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                ⚠️ Reduces map size - data may be lost
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status indicator */}
                        {reloadStatus === 'success' && (
                            <span className="text-green-500 flex items-center">
                                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"/>
                                </svg>
                                Map updated
                            </span>
                        )}
                        {reloadStatus === 'error' && (
                            <span className="text-red-500 flex items-center">
                                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"/>
                                </svg>
                                Error updating map
                            </span>
                        )}

                        {/* Save/Close buttons */}
                        <button
                            onClick={() => {
                                gameEditorRef.current?.saveMap()
                                setHasUnsavedChanges(false)
                            }}
                            disabled={!gameEditorRef || isReloading}
                            className={`px-4 py-2 rounded flex items-center ${
                                hasUnsavedChanges && !isReloading
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isReloading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none"
                                         viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setShowMapControls(false); // Close dropdown when closing editor
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
                    <div className="border-l border-gray-300 h-8 mx-2"/>

                    <select
                        value={selectedMap}
                        onChange={(e) => {
                            if (hasUnsavedChanges) {
                                if (window.confirm('You have unsaved changes. Are you sure you want to switch maps?')) {
                                    gameEditorRef.current!.loadMap(e.target.value)
                                    setSelectedMap(e.target.value);
                                    setHasUnsavedChanges(false);
                                }
                            } else {
                                gameEditorRef.current!.loadMap(e.target.value)
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
                    <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto max-h-full">
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
                                                console.log("Change to "+ index)
                                                gameEditorRef.current!.setSelectedTile('floor', index)
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
                                                gameEditorRef.current!.setSelectedTile('wall', index)
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
                                <h4 className="text-sm font-medium mb-2">Void Tile</h4>
                                <div
                                    className={`w-12 h-12 border-2 cursor-pointer bg-black ${
                                        selectedTileCategory === 'void'
                                            ? 'border-blue-500'
                                            : 'border-transparent'
                                    }`}
                                    onClick={() => {
                                        setSelectedTileCategory('void');
                                        setSelectedTileVariant(0);
                                    }}
                                />
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-2">Portals</h4>
                                <div className="space-y-2">
                                    {/* List existing portals for current zone */}
                                    {gameEditorRef.current?.getPortalsForZone(selectedMap)?.map((portal) => (
                                        <div key={portal.name} className="border border-gray-300 rounded p-2 bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <input
                                                    type="text"
                                                    value={portal.name}
                                                    onChange={(e) => {
                                                        gameEditorRef.current?.updatePortal(portal.name, {
                                                            ...portal,
                                                            name: e.target.value
                                                        });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    className="text-xs font-medium bg-transparent border-none p-0 w-24"
                                                    placeholder="Portal name"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Delete portal "${portal.name}"?`)) {
                                                            gameEditorRef.current?.removePortal(portal.name);
                                                            setHasUnsavedChanges(true);
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                    title="Delete portal"
                                                >
                                                    ×
                                                </button>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-gray-600 w-8">To:</label>
                                                    <select
                                                        value={portal.destination}
                                                        onChange={(e) => {
                                                            gameEditorRef.current?.updatePortal(portal.name, {
                                                                ...portal,
                                                                destination: e.target.value
                                                            });
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                        className="text-xs border border-gray-300 rounded px-1 py-0 flex-1"
                                                    >
                                                        <option value="">Select destination</option>
                                                        {mapNames.filter(name => name !== selectedMap).map(name => (
                                                            <option key={name} value={name}>
                                                                {name.charAt(0).toUpperCase() + name.slice(1)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-gray-600 w-8">X:</label>
                                                    <input
                                                        type="number"
                                                        value={portal.x}
                                                        onChange={(e) => {
                                                            gameEditorRef.current?.updatePortal(portal.name, {
                                                                ...portal,
                                                                x: parseInt(e.target.value) || 0
                                                            });
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                        className="text-xs border border-gray-300 rounded px-1 py-0 w-12"
                                                        min="0"
                                                    />
                                                    <label className="text-xs text-gray-600 w-4">Y:</label>
                                                    <input
                                                        type="number"
                                                        value={portal.y}
                                                        onChange={(e) => {
                                                            gameEditorRef.current?.updatePortal(portal.name, {
                                                                ...portal,
                                                                y: parseInt(e.target.value) || 0
                                                            });
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                        className="text-xs border border-gray-300 rounded px-1 py-0 w-12"
                                                        min="0"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    gameEditorRef.current?.selectPortal(portal.name);
                                                    setSelectedTileCategory('portal');
                                                }}
                                                className={`w-full mt-2 px-2 py-1 text-xs rounded ${
                                                    selectedTileCategory === 'portal' && gameEditorRef.current?.getSelectedPortal() === portal.name
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-gray-200 hover:bg-gray-300'
                                                }`}
                                            >
                                                Edit on Map
                                            </button>
                                        </div>
                                    )) || []}

                                    {/* Add new portal button */}
                                    <button
                                        onClick={() => {
                                            const newPortalName = `portal_${Date.now()}`;
                                            gameEditorRef.current?.addPortal({
                                                name: newPortalName,
                                                destination: '',
                                                x: 0,
                                                y: 0
                                            });
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="w-full px-3 py-2 text-sm border-2 border-dashed border-gray-300 rounded hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                                    >
                                        + Add Portal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Canvas */}
                    <div
                        className="flex-1 relative overflow-auto bg-gray-100 p-4"
                        style={{maxHeight: 'calc(90vh - 200px)'}}
                    >
                        <canvas
                            id="gameEditor"
                            className="border border-gray-300 bg-black block"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}