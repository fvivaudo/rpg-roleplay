import { useNavigate, useSearchParams } from 'react-router';

import logo from '@/assets/react.svg';
import { Head } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/auth';

import { Layout } from '@/components/layouts/auth-layout';
import { LoginForm } from '@/features/auth/components/login-form';
import {RegisterForm} from "@/features/auth/components/register-form.tsx";
import {useEffect} from "react";


export const LandingRoute = () => {
  const navigate = useNavigate();
  // const user = useUser();

  // const [searchParams] = useSearchParams();
  // const redirectTo = searchParams.get('redirectTo');

  // const handleStart = () => {
  //   // if (navigate && user && user.data) {
  //     navigate('/app/game');
  //   // }
  // };



    // useEffect(() => {
    //     console.log('Called')
    //     if (navigate && user.data) {
    //         navigate('/app/game');
    //     }
    // }, [user]);



  return (
    <>
      <Head description="Welcome to bulletproof react" />
      <div className="flex h-screen items-center bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block">Bulletproof React</span>
          </h2>
          <img src={logo} alt="react" />
          <p>Showcasing Best Practices For Building React Applications</p>
          <div className="mt-8 flex justify-center">
            <Layout title="Log in to your account">
              <LoginForm
                  onSuccess={() =>
                      navigate('/app/game')
                      //
                      // navigate(`${redirectTo ? `${redirectTo}` : '/app/game'}`, {
                      //   replace: true,
                      // })
                  }
              />
            </Layout>

              <Layout title="Register your account">
                  <RegisterForm
                      onSuccess={() =>
                          console.log("Success, you can log in now!")
                          // navigate('/app')
                          // navigate(`${redirectTo ? `${redirectTo}` : '/app'}`, {
                          //     replace: true,
                          // }
                          // )
                      }
                  />
              </Layout>
          </div>
        </div>
      </div>
    </>
  );
};
