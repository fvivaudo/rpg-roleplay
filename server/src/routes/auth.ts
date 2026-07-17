import { Elysia } from "elysia";
import { desc, eq } from "drizzle-orm";
import { loginBodySchema, signupBodySchema } from "../schema";
import { db, schema } from "../lib";
import { jwt } from "@elysiajs/jwt";
import {
    ACCESS_TOKEN_EXP,
    JWT_NAME,
    REFRESH_TOKEN_EXP,
} from "../config/constants";
import { getExpTimestamp } from "../lib";
import { authPlugin } from "../plugin";

// Tokens ride httpOnly cookies only; user payloads never include the
// password hash or the stored refresh token.
function toPublicUser<T extends { password?: unknown; refreshToken?: unknown }>(
    user: T
) {
    const { password, refreshToken, ...publicUser } = user;
    return publicUser;
}

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
            const [user] = await db
                .select({
                    id: schema.users.id,
                    name: schema.users.name,
                    email: schema.users.email,
                    password: schema.users.password,
                })
                .from(schema.users)
                .where(eq(schema.users.email, body.email))
                .limit(1);

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
            const [updatedUser] = await db
                .update(schema.users)
                .set({
                    isOnline: true,
                    refreshToken: refreshJWTToken,
                })
                .where(eq(schema.users.id, user.id))
                .returning();
            console.log(
                `${user.name} logged in`
            );
            return {
                message: "Sig-in successfully",
                data: {
                    user: toPublicUser(updatedUser),
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
        async ({ body, jwt, cookie: { accessToken, refreshToken }, error }) => {
            // hash password
            const password = await Bun.password.hash(body.password, {
                algorithm: "bcrypt",
                cost: 10,
            });

            let user;
            try {
                [user] = await db
                    .insert(schema.users)
                    .values({
                        ...body,
                        password,
                    })
                    .returning();
            } catch (e) {
                // 23505 = Postgres unique_violation (duplicate email). Drizzle
                // wraps driver errors, so the SQLSTATE may sit on `.cause`.
                const code =
                    (e as { code?: string }).code ??
                    (e as { cause?: { code?: string } }).cause?.code;
                if (code === "23505") {
                    // Return via the status helper so eden treats it as an error
                    // response, keeping the success `data` type clean.
                    return error(409, {
                        name: "Error",
                        message: `The email address provided ${body.email} already exists`,
                    });
                }
                throw e;
            }

            // Signup logs the account straight in (same cookie pair as
            // /login) so the client lands in the app fully authenticated —
            // the client caches the returned user as the session user.
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

            const [loggedInUser] = await db
                .update(schema.users)
                .set({ isOnline: true, refreshToken: refreshJWTToken })
                .where(eq(schema.users.id, user.id))
                .returning();

            console.log(
                `${user.name} account with email ${user.email} created`
            );

            return {
                message: "Account created successfully",
                data: {
                    user: toPublicUser(loggedInUser),
                },
            };
        },
        {
            body: signupBodySchema,
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
            const userId = jwtPayload.sub as string;

            // verify user exists or not
            const [user] = await db
                .select()
                .from(schema.users)
                .where(eq(schema.users.id, userId))
                .limit(1);

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
            await db
                .update(schema.users)
                .set({ refreshToken: refreshJWTToken })
                .where(eq(schema.users.id, user.id));

            return {
                message: "Access token generated successfully",
            };
        }
    )
    .use(authPlugin)
    .post("/logout", async ({ cookie: { accessToken, refreshToken }, user }) => {

        // remove refresh token and access token from cookies
        accessToken.remove();
        refreshToken.remove();

        // remove refresh token from db & set user online status to offline
        await db
            .update(schema.users)
            .set({
                isOnline: false,
                refreshToken: null,
            })
            .where(eq(schema.users.id, user.id));
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
        const extraDataUser = await db.query.users.findFirst({
            where: eq(schema.users.id, user.id),
            columns: { password: false, refreshToken: false },
            with: {
                gameChatHistory: {
                    columns: {
                        id: true,
                        createdAt: true,
                        characterName: true,
                        content: true,
                    },
                    orderBy: desc(schema.chatMessages.createdAt),
                },
            },
        });

        // console.log(extraDataUser)

        return {
            message: "Fetch current user",
            data: {
                user: extraDataUser ?? null,
            },
        };
    });
