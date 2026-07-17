import { edenTreaty  } from "@elysiajs/eden";
// import { treaty  } from "@elysiajs/eden";
// import type {Server} from '@backend/'
import { type Server } from "../../../server/src";

import  { Treaty } from "@elysiajs/eden";
import {LoginInput, RegisterInput} from "@/lib/auth.tsx";
// import Cookies from "js-cookie";
// import  { EdenTreaty } from "@elysiajs/eden/dist/treaty";
import type {User, ChatMessage} from "@rpg/protocol";

export type UserData = User & {gameChatHistory: Omit<ChatMessage, "modifiedAt"|"characterId"|"userId">[]}
export interface Message {
    id: string;
    characterId: string;
    characterName: string;
    content: string;
    createdAt: Date;
}

type MessageResponse = {
    id: string;
    characterId: string;
    characterName: string;
    content: string;
    createdAt: Date;
    // messages: Message[];
};

export type HandleMessage = ({
                                 data: { characterId, characterName, content, createdAt, id },
                             }: Treaty.OnMessage<MessageResponse>) => void;

// TODO Swap to treaty once credentials are once more properly transferred to backend (should be patched by february)
const server = edenTreaty<Server>("http://localhost:3000");

class api {
    private server = server;

    async ping() {
        const { data, error } = await this.server.auth.index.get();
        if (error) throw error;
        return data;
    }

    async getUser():Promise<{message: string, data: {user: UserData | null}}> {

        const { data, error } = await this.server.auth.me.get({
            // Makes sure we send our cookie to the backend
            $fetch: {
                credentials: 'include',
            },
        });

        // TODO handle property the possibility of userdata being null
        if (error) throw error;

        return data;
    }

    async logout() {
        const { data, error } = await this.server.auth.logout.post({
            // Makes sure we send our cookie to the backend
            $fetch: {
                credentials: 'include',
                // mode: 'cors',
                // headers: { 'Content-Type': 'application/json' },
            }
        });
        if (error) throw error;
        return data;
    }

    async login(loginInput:LoginInput) {
        const { data, error } = await this.server.auth.login.post({
            ...loginInput,
            // credentials:'include' is required for the browser to store the
            // httpOnly cookie pair the server sets on the response.
            $fetch: {
                credentials: 'include',
            },
        });
        if (error) throw error;
        return data;
    }

    async signUp(registerInput:RegisterInput) {
        const { data, error } = await this.server.auth.signup.post({
            ...registerInput,
            $fetch: {
                credentials: 'include',
            },
        });

        if (error) throw error;
        return data;
    }

    gameChatConnect(handleMessage: HandleMessage, userId:string, characterId:string) {
        const ws = this.server.chat.subscribe({
            $query: {
                // TODO Differentiate at some point from userId, a user can have several characters
                userId,
                characterId
            }
        });


        // @ts-expect-error can't find fitting type
        ws.on("message", handleMessage);

        return ws;
    }

    gameChatDisconnect(
        ws: ReturnType<typeof this.gameChatConnect>,
        handleMessage: HandleMessage
    ) {
        // @ts-expect-error can't find fitting type
        ws.off("message", handleMessage);
        ws.close();
    }

    // async getRooms() {
    //     const { data, error } = await this.server.room.get();
    //     if (error) throw error;
    //     return data;
    // }

    // joinRoom(roomId: string, handleMessage: HandleMessage) {
    //     const ws = this.server.ws[roomId].subscribe();
    //     ws.on("message", handleMessage);
    //
    //     return ws;
    // }
    //
    // leaveRoom(
    //     ws: ReturnType<typeof this.joinRoom>,
    //     handleMessage: HandleMessage
    // ) {
    //     ws.off("message", handleMessage);
    //     ws.close();
    // }
}

export default new api();



// import Axios, {InternalAxiosRequestConfig} from 'axios';
//
// import {useNotifications} from '@/components/ui/notifications';
// // import {env} from '@/config/env';
//
// function authRequestInterceptor(config: InternalAxiosRequestConfig) {
//     if (config.headers) {
//         config.headers.Accept = 'application/json';
//     }
//
//     config.withCredentials = true;
//     return config;
// }
//
// export const api = Axios.create({
//     baseURL: env.API_URL,
// });
//
// api.interceptors.request.use(authRequestInterceptor);
// api.interceptors.response.use(
//     (response) => {
//         return response.data;
//     },
//     (error) => {
//         const message = error.response?.data?.message || error.message;
//         useNotifications.getState().addNotification({
//             type: 'error',
//             title: 'Error',
//             message,
//         });
//
//         if (error.response?.status === 401) {
//             const searchParams = new URLSearchParams();
//             const redirectTo = searchParams.get('redirectTo');
//             window.location.href = `/auth/login?redirectTo=${redirectTo}`;
//         }
//
//         return Promise.reject(error);
//     },
// );
