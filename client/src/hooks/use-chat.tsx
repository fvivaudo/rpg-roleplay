import {useCallback, useEffect, useState} from "react";
import api, {HandleMessage, Message} from "lib/api-client";

// Our link between the API and the frontend
export const useChat = (
    history: Message[],
    userId: string,
    characterId: string,
    characterName: string
) => {
    const [messages, setMessages] = useState<Message[]>(history);
    const [ws, setWs] = useState<ReturnType<typeof api.gameChatConnect>>();
    const sendMessage = useCallback(
        (content: string) => {
            // console.log(user.data)
            if (ws)
                ws.send({content, characterId, characterName});
            // ws.send({content, author:user.data.name});
        },
        [ws, characterId, characterName]
    );


    useEffect(() => {
        const handleMessage: HandleMessage = ({data}) => {
            // console.log(messages);
            // console.log(data);
            // setAuthor(author);
            // setMessages([...messages, ...data.messages])
            setMessages([...messages, data])
        };

        const ws = api.gameChatConnect(handleMessage, characterId, userId);
        setWs(ws);


        return () => {
            api.gameChatDisconnect(ws, handleMessage);
        };
    }, [messages, characterId, userId]);

    // useEffect(() => {
    //     const handleMessage: HandleMessage = ({ data: { author, messages } }) => {
    //         console.log(author);
    //         setAuthor(author);
    //         setMessages(messages);
    //     };
    //
    //     const ws = API.joinRoom(roomId, handleMessage);
    //     setWs(ws);
    //
    //     return () => {
    //         API.leaveRoom(ws, handleMessage);
    //     };
    // }, []);

    return {messages, sendMessage};
}
