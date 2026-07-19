export type TileType = 'floor' | 'wall' | 'void';
export type GameMode = 'normal' | 'tactical' | 'editor';
export type ItemType = 'normal' | 'portal';

export interface MapCell {
    type: TileType;
    tileId: number;
}

export interface Item {
    type: ItemType;
    // id: number;
    name: string;
    // itemSprite: number;
}

export interface Position {
    x: number;
    y: number;
}

// Two portals with the same name/id are linked
export interface Portal {
    name: string; // id
    destination: string; // zone
    x: number;
    y: number;
}

export interface GroundObject {
    type: TileType;
    x: number;
    y: number;
}

export interface MapData {
    // layout: (number | string)[][];
    groundLayer: (MapCell)[][];
    // itemLayer: (Item)[][];
    startPosition: Position;
    zonePositions?: Portal[];
    playableArea?: boolean[][];
    width?: number;
    height?: number;
}