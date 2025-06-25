import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import { JWT_NAME } from "./config/constants";
import { prisma } from "./lib";
import cors from "@elysiajs/cors";

const authPlugin = (app: Elysia) =>
    app
        .use(
            jwt({
                name: JWT_NAME,
                secret: Bun.env.JWT_SECRET!,
            })
        )
        .derive(async ({
                           jwt,
                           cookie: { accessToken, refreshToken },
                           set ,
                           error}) => {

            if (!accessToken.value) {
                // handle error for access token is not available
                set.status = "Unauthorized";
                return error(401, 'Access token is missing')
                // throw new Error("Access token is missing");
            }
            const jwtPayload = await jwt.verify(accessToken.value);
            if (!jwtPayload) {
                // handle error for access token is tempted or incorrect
                set.status = "Forbidden";
                return error(403, 'Access token is invalid')
                // throw new Error("Access token is invalid");
            }

            const userId = jwtPayload.sub;
            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

            if (!user) {
                // handle error for user not found from the provided access token
                set.status = "Forbidden";
                return error(403, 'Access token is invalid')
                // throw new Error("Access token is invalid");
            }

            return {
                user,
            };
        });

export { authPlugin };
