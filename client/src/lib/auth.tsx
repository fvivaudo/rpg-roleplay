import {configureAuth} from 'react-query-auth';
import {Navigate} from 'react-router';
import {z} from 'zod';

import type {AuthResponse} from '@/types/api';
import type {UserData} from "./api-client";
import type {User} from '@rpg/protocol'

import api from './api-client';
import React from "react";

// api call definitions for auth (types, schemas, requests):
// these are not part of features as this is a module shared across features

const userFn = async (): Promise<UserData | null> => {
    const response = await api.getUser();
    return response.data.user
};
const logoutFn = async (): Promise<{message: string}> => {
    return api.logout();
};


export const loginInputSchema = z.object({
    email: z.string().min(1, 'Required').email('Invalid email'),
    // Matches the server's minLength: 8 so errors surface before the request
    password: z.string().min(8, 'At least 8 characters'),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
const loginWithEmailAndPassword = (data: LoginInput): Promise<AuthResponse> => {
    return api.login(data);
};

const loginFn = async (data: LoginInput):Promise<User> => {
    const response = await loginWithEmailAndPassword(data)
    const user = await handleUserResponse(response)
    return user
}

export const registerInputSchema = z
    .object({
        email: z.string().min(1, 'Required').email('Invalid email'),
        name: z.string().min(1, 'Required').max(20, 'Max 20 characters'),
        password: z.string().min(8, 'At least 8 characters'),
    })

export type RegisterInput = z.infer<typeof registerInputSchema>;

const registerWithEmailAndPassword = (
    data: RegisterInput,
) => {
    // console.log(api.signUp(data))
    return api.signUp(data);
};

const registerFn = async (data: RegisterInput) => {
    const response = await registerWithEmailAndPassword(data)
    // const user = await handleUserResponse(response)
    // return user
    return response.data.user;
}

// Auth cookies are httpOnly and set by the server on login/signup (the fetch
// runs with credentials:'include'); the client never touches tokens itself.
async function handleUserResponse(data: AuthResponse) {
    const { user } = data.data
    return user
}


// Register, then login.
// const authConfig = {
//     userFn: userFn,
//     loginFn: loginFn,
//     registerFn: registerFn,
//     logoutFn: logoutFn,
// };


// eslint-disable-next-line react-refresh/only-export-components
export const { useUser, useLogin, useLogout, useRegister, AuthLoader} =
    configureAuth({
        userFn: userFn,
        loginFn,
        registerFn,
        logoutFn,
    });


const AuthPending = () => (
    <div className="flex h-screen items-center justify-center bg-[#07070d] text-xs uppercase tracking-[0.3em] text-slate-600">
        Authenticating…
    </div>
);

// If we're  connected, redirect to the game
export const ConnectRedirectRoute = ({children}: { children: React.ReactNode }) => {
    const user = useUser();

    if (user.isLoading) {
        return <AuthPending />;
    }

    if (user.data) {
        return (
            <Navigate
                to={`/app/game`}
                replace
            />
        );
    }

    return children;
};

// If we're not connected, redirect to the landing. Waits for the /me query to
// settle first so a full-page load of a deep link (e.g. /app/editor) doesn't
// bounce through the landing redirect chain.
export const ProtectedRoute = ({children}: { children: React.ReactNode }) => {
    const user = useUser();

    if (user.isLoading) {
        return <AuthPending />;
    }

    if (!user.data) {
        return (
            <Navigate
                to={`/`}
                replace
            />
        );
    }

    return children;
};
