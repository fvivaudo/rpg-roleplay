import {Link, useNavigate, useSearchParams} from 'react-router';

import {ArrowsOutCardinal} from "@phosphor-icons/react";
import interact from 'interactjs'

// import logo from '@/assets/react.svg';
// import {Head} from '@/components/seo';
// import {Button} from '@/components/ui/button';
import {useLogout, useUser} from '@/lib/auth.tsx';

// import {Layout} from '@/components/layouts/auth-layout.tsx';
// import {LoginForm} from '@/features/auth/components/login-form.tsx';
// import {RegisterForm} from "@/features/auth/components/register-form.tsx";
// import * as ex from 'excalibur';
import {ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {Message, UserData} from "@/lib/api-client";
import {useChat} from "@/hooks/use-chat";
import { Game } from './game';
import {StatusWindow} from "@/components/game/StatusWindow.tsx";
import {TileSelector} from "@/components/game/TileSelector.tsx";
import {MapEditorScreen} from "@/components/game/MapEditorScreen.tsx";


type WindowWrapperProps = {
    children?: ReactNode
    objectId: string
    className?: string
}
const WindowWrapper = ({children, objectId, className}: WindowWrapperProps) => {
    const position = {x: 0, y: 0}

    interact('#' + objectId)
        .draggable({
            allowFrom: '.drag-handle',
            listeners: {
                start(event) {
                    // console.log(event.type, event.target)
                },
                move(event) {
                    position.x += event.dx
                    position.y += event.dy

                    event.target.style.transform =
                        `translate(${position.x}px, ${position.y}px)`
                },
            }
        })
        .resizable({
            // resize from bottom and right border
            edges: {bottom: true, right: true},

            listeners: {
                move: function (event) {
                    let {x, y} = event.target.dataset

                    x = (parseFloat(x) || 0) + event.deltaRect.left
                    y = (parseFloat(y) || 0) + event.deltaRect.top

                    Object.assign(event.target.style, {
                        width: `${event.rect.width}px`,
                        height: `${event.rect.height}px`,
                        // transform: `translate(${x}px, ${y}px)`
                    })

                    Object.assign(event.target.dataset, {x, y})
                }
            },
            modifiers: [
                // keep the edges inside the parent
                interact.modifiers.restrictEdges({
                    outer: 'parent'
                }),

                // minimum size
                interact.modifiers.restrictSize({
                    min: {width: 100, height: 50}
                })
            ],

            inertia: true
        })
    return (
        <div
            id={objectId}
            className={`${className} absolute window-default `}
        >
            {children}
        </div>
    )
}

const ChatWindow = ({history, userId, characterId, characterName}: {
    history: Message[],
    userId: string,
    characterId: string,
    characterName: string
}) => {
    const [inputMessage, setInputMessage] = useState("");

    const {messages, sendMessage} = useChat(history, userId, characterId, characterName);

    console.log("Render")

    const handleInput = useCallback((e) => {
        setInputMessage(e.target.value);
    }, []);

    const handleSend = useCallback(
        (e) => {
            if (inputMessage.length) {
                sendMessage(inputMessage);
                setInputMessage("");
            }
        },
        [sendMessage, inputMessage]
    );

    const handleKeypress = e => {
        //it triggers by pressing the enter key
        if (inputMessage.length && e.keyCode === 13) {
            handleSend(e);
        }
    };

    return (
        // <div className="draggable window-default relative w-96 h-96 text-white flex flex-col">
        //     <div className="resize-drag absolute window-default w-96 h-96 text-white flex flex-col">
        <>
            <div className="drag-handle absolute h-6 w-6 top-2 right-4 text-center">
                <ArrowsOutCardinal size={32} color="#3B82F6C2"/>
            </div>
            <div className="overflow-y-scroll  h-full flex flex-col flex-grow no-scrollbar break-words">
                {messages
                    ? messages.map(({id, characterName, content}) => (
                        <div key={id} className="px-2">
                            <span>{characterName} : {content}</span>
                        </div>
                    ))
                    : "Loading..."}
            </div>
            <input className="window-default h-12 text-white w-full flex"
                   placeholder="type your message here..."
                   value={inputMessage}
                   onChange={handleInput}
                   onKeyDown={handleKeypress}>
            </input>
            {/*<button onClick={handleSend}>send</button>*/}

            {/*<div className="resize-handle absolute bottom-0 h-6 w-6 -right-6 window-default">*/}
            {/*    r*/}
            {/*</div>*/}
        </>
    )
}


// const game = new ex.Engine({
//     width: 400,
//     height: 500,
//     backgroundColor: ex.Color.fromHex("#54C0CA"),
//     pixelArt: true,
//     pixelRatio: 2,
//     displayMode: ex.DisplayMode.FitScreen
// });
//
// game.start();
// TODO declare gameCanvas component to wrap game into
// const game = new ex.Engine({
//     width: 0, // the width of the canvas
//     height: 0, // the height of the canvas
//     enableCanvasTransparency: true, // the transparencySection of the canvas
//     canvasElementId: 'game', // the DOM canvas element ID, if you are providing your own
//     // displayMode: ex.DisplayMode.FillScreen, // the display mode
//     // pointerScope: ex.PointerScope.Document, // the scope of capturing pointer (mouse/touch) events
//     backgroundColor: ex.Color.fromHex('#2185d0') // background color of the engine
// });
//
// game.start();

export const GameRoute = () => {
    const gameRef = useRef<Game | null>(null);
    const [statusWindow, setStatusWindow] = useState({
        isOpen: false,
        position: { x: 0, y: 0 }
    });
    const [tileSelectorOpen, setTileSelectorOpen] = useState(false);
    const [mapEditorOpen, setMapEditorOpen] = useState(false);

    useEffect(() => {
        if (!gameRef.current) {
            gameRef.current = new Game();

            // Subscribe to player click events
            gameRef.current.onPlayerClick = (x: number, y: number) => {
                setStatusWindow({
                    isOpen: true,
                    position: { x, y }
                });
            };

            gameRef.current.start();
        }

        // Listen for tile selector events
        // const handleTileSelectorOpen = () => {
        //     setTileSelectorOpen(true);
        // };
        //
        // window.addEventListener('setTileSelectorOpen', handleTileSelectorOpen);
        //
        // return () => {
        //     window.removeEventListener('setTileSelectorOpen', handleTileSelectorOpen);
        //     if (gameRef.current) {
        //         gameRef.current = null;
        //     }
        // };
    }, []);

    const handleTileSelect = (type: 'floor' | 'wall', tileId: number) => {
        if (gameRef.current) {
            gameRef.current.setSelectedTile(type, tileId);
        }
    };

    const handleMapSelect = (mapName: string) => {
        if (gameRef.current) {
            gameRef.current.loadMap(mapName);
        }
    };

    const navigate = useNavigate();
    const user = useUser();
    const logout = useLogout();

    // TODO store entire ux state and restore it from user db
    const [UxElements, setUxElements] = useState([])

    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirectTo');

    useEffect(() => {
        if (!user.data) {
            navigate('/');
        }
    }, [navigate, user]);

    if (!user.data) {
        return <div>Loading</div>
    }

    console.log(user.data)
    // <Button disabled={logout.isLoading} onClick={() => logout.mutate({})}>
    //     Log out
    // </Button>


    // return (
    //     <>
    //         <div className="relative w-full h-screen no-scrollbar">
    //             <canvas id={'game'} width={800} height={600} />
    //             <div
    //                 className={"-z-40 absolute w-full h-full bg-cover bg-[url('/game/background.webp')] brightness-75"}/>
    //             {/*{UxElements.map(item) => {*/}
    //             {/*    <ChatWindow/>*/}
    //             {/*    <ChatWindow/>*/}
    //             {/*}}*/}
    //             <WindowWrapper objectId={'chatBox1'} className={'w-96 h-96 text-white flex flex-col'}>
    //                 {/*TODO Differentiate between user and characters*/}
    //                 <ChatWindow
    //                     history={user.data.gameChatHistory}
    //                     userId={user.data.id}
    //                     characterId={user.data.id}
    //                     characterName={user.data.name}/>
    //             </WindowWrapper>
    //             {/*<WindowWrapper objectId={'chatBox2'} className={'w-96 h-96 text-white flex flex-col'}>*/}
    //             {/*    <ChatWindow/>*/}
    //             {/*</WindowWrapper>*/}
    //         </div>
    //     </>
    // );

    return (
        <div className="relative">
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="flex flex-col items-center gap-4">
                    {/*<div className="bg-white p-4 rounded-lg shadow-md">*/}
                    {/*    <h2 className="text-lg font-semibold mb-2">Controls</h2>*/}
                    {/*    <ul className="space-y-1">*/}
                    {/*        <li><kbd className="px-2 py-1 bg-gray-100 rounded">T</kbd> Toggle Tactical Mode</li>*/}
                    {/*        <li><kbd className="px-2 py-1 bg-gray-100 rounded">E</kbd> Toggle Editor Mode</li>*/}
                    {/*        <li><kbd className="px-2 py-1 bg-gray-100 rounded">N</kbd> Normal Mode</li>*/}
                    {/*        <li><kbd className="px-2 py-1 bg-gray-100 rounded">V</kbd> Open Tile Selector</li>*/}
                    {/*        <li><kbd className="px-2 py-1 bg-gray-100 rounded">M</kbd> Open Map Editor</li>*/}
                    {/*    </ul>*/}
                    {/*</div>*/}
                    <button
                        onClick={() => setMapEditorOpen(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Open Map Editor
                    </button>
                    <canvas id="game"></canvas>
                </div>
            </div>
            <WindowWrapper objectId={'chatBox1'} className={'w-96 h-96 text-white flex flex-col'}>
                {/*TODO Differentiate between user and characters*/}
                <ChatWindow
                    history={user.data.gameChatHistory}
                    userId={user.data.id}
                    characterId={user.data.id}
                    characterName={user.data.name}/>
            </WindowWrapper>
            <StatusWindow
                isOpen={statusWindow.isOpen}
                position={statusWindow.position}
                onClose={() => setStatusWindow(prev => ({ ...prev, isOpen: false }))}
            />
            <TileSelector
                isOpen={tileSelectorOpen}
                onClose={() => setTileSelectorOpen(false)}
                onSelect={handleTileSelect}
            />
            <MapEditorScreen
                isOpen={mapEditorOpen}
                onClose={() => setMapEditorOpen(false)}
                onMapSelect={handleMapSelect}
            />
        </div>
    );
};
