import { Elysia } from "elysia";
import { loginBodySchema, signupBodySchema } from "./schema";
import { prisma } from "./lib";
import { jwt } from "@elysiajs/jwt";
import {
    ACCESS_TOKEN_EXP,
    JWT_NAME,
    REFRESH_TOKEN_EXP,
} from "./config/constants";
import { getExpTimestamp } from "./lib";
import { authPlugin } from "./plugin";


export const authRoutes = new Elysia({ prefix: "/auth" })
    .get('/', () => 'Hi Elysia')
    .use(
        jwt({
            name: JWT_NAME,
            secret: Bun.env.JWT_SECRET!,
        })
    )
    .post(
        "/login",
        async ({ body, jwt, cookie: { accessToken, refreshToken }, set }) => {
            // match user email
            const user = await prisma.user.findUnique({
                where: { email: body.email },
                select: {
                    id: true,
                    name:true,
                    email: true,
                    password: true,
                },
            });



            if (!user) {
                set.status = "Bad Request";
                throw new Error(
                    "The email address or password you entered is incorrect"
                );
            }

            // match password
            const matchPassword = await Bun.password.verify(
                body.password,
                user.password,
                "bcrypt"
            );
            if (!matchPassword) {
                set.status = "Bad Request";
                throw new Error(
                    "The email address or password you entered is incorrect"
                );
            }

            // create access token
            const accessJWTToken = await jwt.sign({
                sub: user.id,
                exp: getExpTimestamp(ACCESS_TOKEN_EXP),
            });
            accessToken.set({
                value: accessJWTToken,
                httpOnly: true,
                maxAge: ACCESS_TOKEN_EXP,
                path: "/",
            });

            // create refresh token
            const refreshJWTToken = await jwt.sign({
                sub: user.id,
                exp: getExpTimestamp(REFRESH_TOKEN_EXP),
            });

            refreshToken.set({
                value: refreshJWTToken,
                httpOnly: true,
                maxAge: REFRESH_TOKEN_EXP,
                path: "/",
            });

            // set user profile as online
            const updatedUser = await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    isOnline: true,
                    refreshToken: refreshJWTToken,
                },
            });
            console.log(
                `${user.name} logged in`
            );
            return {
                message: "Sig-in successfully",
                data: {
                    user: updatedUser,
                    accessToken: accessJWTToken,
                    refreshToken: refreshJWTToken,
                },
            };
        },
        {
            body: loginBodySchema,
        }
    )
    // TODO add email validation
    .post(
        "/signup",
        async ({ body }) => {
            // hash password
            const password = await Bun.password.hash(body.password, {
                algorithm: "bcrypt",
                cost: 10,
            });

            const user = await prisma.user.create({
                data: {
                    ...body,
                    password,
                },
            });
            console.log(
                `${user.name} account with email ${user.email} created`
            );

            return {
                message: "Account created successfully",
                data: {
                    user,
                },
            };
        },
        {
            body: signupBodySchema,
            error({ code, set, body }) {
                // handle duplicate email error throw by prisma
                // P2002 duplicate field error code
                if ((code as unknown) === "P2002") {
                    set.status = "Conflict";
                    return {
                        name: "Error",
                        message: `The email address provided ${body.email} already exists`,
                    };
                }
            },
        }
    )
    .post(
        "/refresh",
        async ({ cookie: { accessToken, refreshToken }, jwt, set, error }) => {
            if (!refreshToken.value) {
                // handle error for refresh token is not available
                set.status = "Unauthorized";
                return error(401, 'Refresh token is missing')
                // throw new Error("Refresh token is missing");
            }
            // get refresh token from cookie
            const jwtPayload = await jwt.verify(refreshToken.value);
            if (!jwtPayload) {
                // handle error for refresh token is tempted or incorrect
                set.status = "Forbidden";
                return error(403, 'Refresh token is invalid')
                // throw new Error("Refresh token is invalid");
            }

            // get user from refresh token
            const userId = jwtPayload.sub;

            // verify user exists or not
            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

            if (!user) {
                // handle error for user not found from the provided refresh token
                set.status = "Forbidden";
                // throw new Error("Refresh token is invalid");
                return error(403, 'Refresh token is invalid')
            }
            // create new access token
            const accessJWTToken = await jwt.sign({
                sub: user.id,
                exp: getExpTimestamp(ACCESS_TOKEN_EXP),
            });
            accessToken.set({
                value: accessJWTToken,
                httpOnly: true,
                maxAge: ACCESS_TOKEN_EXP,
                path: "/",
            });

            // create new refresh token
            const refreshJWTToken = await jwt.sign({
                sub: user.id,
                exp: getExpTimestamp(REFRESH_TOKEN_EXP),
            });
            refreshToken.set({
                value: refreshJWTToken,
                httpOnly: true,
                maxAge: REFRESH_TOKEN_EXP,
                path: "/",
            });

            // set refresh token in db
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    refreshToken: refreshJWTToken,
                },
            });

            return {
                message: "Access token generated successfully",
                data: {
                    accessToken: accessJWTToken,
                    refreshToken: refreshJWTToken,
                },
            };
        }
    )
    .use(authPlugin)
    .post("/logout", async ({ cookie: { accessToken, refreshToken }, user }) => {

        // remove refresh token and access token from cookies
        accessToken.remove();
        refreshToken.remove();

        // remove refresh token from db & set user online status to offline
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                isOnline: false,
                refreshToken: null,
            },
        });
        console.log(
            `${user.name} logout`
        );
        return {
            message: "Logout successfully",
        };
    })
    .use(authPlugin)
    .get("/me", async ({ user }) => {
        // It's a waste to do two requests with the plugin already fetching user, but couldn't find better at the moment
        const extraDataUser = await prisma.user.findUnique({
            where: {
                id: user.id,
            },
            include: {
                gameChatHistory: {
                    select: {
                        id: true,
                        createdAt: true,
                        characterName: true,
                        content: true,
                        // characterId: true,
                    },
                },
            },
        });

        // console.log(extraDataUser)

        return {
            message: "Fetch current user",
            data: {
                user:extraDataUser,
            },
        };
    });
