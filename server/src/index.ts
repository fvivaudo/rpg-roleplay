import Elysia, {t} from 'elysia'

import {authRoutes, characterRoutes, mapRoutes, forumRoutes} from "./routes";
import {swagger} from '@elysiajs/swagger'
import cors from "@elysiajs/cors";
import type {ElysiaWS} from "elysia/ws";
import {authPlugin} from "./plugin.ts";
import {db, schema} from "./lib";
import {seed} from "./db/seed";

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

const validateOrigin = (request: Request) => {
    const origin = request.headers.get("origin") || "";
    return !!allowedOrigins.includes(origin);
};

let connectedUsers: { ws: ElysiaWS, userId: string, characterId: string }[] = [];

const app = new Elysia()
    // .use(cors({
    //         // origin: true,
    //         origin: /localhost.*/,
    //         methods: "*",
    //         allowedHeaders: ["content-type"],
    //         exposeHeaders: "*",
    //         credentials: true,
    //         maxAge: 50000,
    //         preflight: true,
    //     }))
    .use(cors({
        credentials: true,
        origin: /localhost.*/,
    }))
    // Get access to swagger through /api/docs path. Need to use things this way as swagger doesn't handle api prefix well otherwise
    .use(swagger({
            // provider: "swagger-ui",
            path: "/api/docs",
        })
    )
    .use(new Elysia({prefix: "/api"}))
    .use(authRoutes)
    .use(characterRoutes)
    .use(mapRoutes)
    .use(forumRoutes)
    .ws('/chat', {
        body: t.Object({
            // id: t.String(),
            characterId: t.String(),
            characterName: t.String(),
            content: t.String(),
            // createdAt: t.Date()
        }),
        query: t.Object({
            userId: t.String(),
            characterId: t.String()
        }),

        // TODO check input and forbid messages past a character limit
        // TODO setup a common type between front and back, see todos-react-elysia
        message(ws, message) {
            const usersIdInRange = connectedUsers.map(u => u.userId)

            connectedUsers.forEach((user) =>
                user.ws.send({
                    id: crypto.randomUUID(),
                    characterName: message.characterName,
                    characterId: message.characterId,
                    content: message.content,
                    createdAt: Date.now()
                })
            )

            // TODO fit in transaction
            usersIdInRange.forEach((userId) =>
                db.insert(schema.chatMessages)
                    .values({
                        characterName: message.characterName,
                        characterId: message.characterId,
                        content: message.content,
                        userId,
                    })
                    .then((result) => {
                        console.log('Operation successful:', result);
                    }).catch((error) => {
                        console.error('Error occurred:', error);
                    })
            )
        },
        open(ws) {
            // TODO check if userId is already present to prevent multiple connections
            connectedUsers.push({ws: ws, characterId: ws.data.query.characterId, userId: ws.data.query.userId})

            console.log(ws.data.query.characterId)
            console.log("WEBSOCKET OPENED", ws.id);
            // ws.send({
            //     author: user.name,
            //     messages: room.messages,
            // });
        },
        close(ws) {
            // TODO mark users as inactive on close
            const updatedArray = connectedUsers.filter(obj => obj.ws.id !== ws.id);
            connectedUsers = [...updatedArray]

            console.log("WEBSOCKET closed", ws.id);
        },

    })
    .listen(3000);


console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Idempotent: seeds the default district map and forum categories when the
// corresponding tables are empty.
seed().catch((err) => console.error("Seed failed", err));


// const app = new Elysia()
//     .ws('/chat', {
//         body: t.String(),
//         response: t.String(),
//         message(ws, message) {
//             ws.send(message)
//         }
//     })
//     .ws('/ping', {
//         body: t.String(),
//         response: t.String(),
//         message(ws, message) {
//             ws.send('hello ' + message)
//         }
//     })
//     .use(auth)
//     .listen(3000)


export type Server
    = typeof app

