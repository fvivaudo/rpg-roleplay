import Elysia, {t} from 'elysia'
import {treaty} from '@elysiajs/eden'

const app = new Elysia()
    .ws('/chat', {
        body: t.String(),
        response: t.String(),
        message(ws, message) {
            ws.send(message)
        }
    })
    .ws('/ping', {
        body: t.String(),
        response: t.String(),
        message(ws, message) {
            ws.send('hello ' + message)
        }
    })
    .listen(3000)


export type App
    = typeof app

