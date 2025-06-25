import {configureAuth} from 'react-query-auth';
import {Navigate} from 'react-router';
import {z} from 'zod';

import type {AuthResponse} from '@/types/api';
import type {UserData} from "./api-client";
import type {User} from '@prisma/client'

import api from './api-client';
import React from "react";
import Cookies from 'js-cookie';

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
    password: z.string().min(5, 'Required'),
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
        email: z.string().min(1, 'Required'),
        name: z.string().min(1, 'Required').max(20, 'Max 20 characters'),
        // lastName: z.string().min(1, 'Required'),
        password: z.string().min(1, 'Required'),
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

async function handleUserResponse(data: AuthResponse) {
    const { refreshToken, accessToken, user } = data.data

    Cookies.set('accessToken', accessToken, { expires: 7 })
    Cookies.set('refreshToken', refreshToken, { expires: 7 })
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


// If we're  connected, redirect to the game
export const ConnectRedirectRoute = ({children}: { children: React.ReactNode }) => {
    const user = useUser();

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

// If we're not connected, redirect to the landing
export const ProtectedRoute = ({children}: { children: React.ReactNode }) => {
    const user = useUser();
    // const location = useLocation();

    if (!user.data) {
        return (
            <Navigate
                // to={`/auth/login?redirectTo=${encodeURIComponent(location.pathname)}`}
                to={`/`}
                replace
            />
        );
    }

    return children;
};
