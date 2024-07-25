import {SetStateAction, useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import type {App} from '@nekron/server'
import {edenTreaty, treaty} from "@elysiajs/eden";

const app = edenTreaty<App>(window.location.origin)

function App() {
    const [count, setCount] = useState(0)
    const [socket, setSocket] = useState<WebSocket>(null)
    // `${WS_URL}/room/${selectedRoomId}?username=${username()}`,



    window.onbeforeunload = function () {
        if (socket.readyState == WebSocket.OPEN) {
            socket.close(
                1000,
                "window.onbeforeunload: Closing connection when leaving page",
            );
        }
    };

    useEffect(() => {
        const newSocket = new WebSocket(
            'ws://localhost:3000/ping'
        );
        //
        newSocket.onopen = function (e) {
            console.log("ws connected");
        };
        // //
        newSocket.onclose = function (e) {
            console.log("ws connection closed");
        };

        newSocket.addEventListener("message", (event) => {
            if (event) {
                console.log(event)
                // if (firstMessage()) {
                //     const data = event.data.split("\n");
                //     if (data.length > 0) {
                //         setMessages(data);
                //     }
                //     setFirstMessage(false);
                // } else {
                //     setMessages((prev) => [...prev, event.data]);
                // }
                // const container = messagesContainer();
                // if (container) {
                //     container.scrollTop = container.scrollHeight;
                // }
            }
        });
        setSocket(newSocket)
    }, [])


    // const chat = api.ping.subscribe()
    //
    // chat.subscribe((message) => {
    //     console.log('got', message)
    // })
    //
    // chat.send('hello from client')

    return (
        <>
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo"/>
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo"/>
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <button onClick={() => {
                    setCount((count) => count + 1);
                    socket.send('test');
                }}
                >
                    count is {count}
                </button>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </>
    )
}

export default App
