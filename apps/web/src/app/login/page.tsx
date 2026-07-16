"use client";

import { useCallback, useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function LoginPage() {
	const [showSignIn, setShowSignIn] = useState(false);
	const showSignUpForm = useCallback(() => {
		setShowSignIn(false);
	}, []);
	const showSignInForm = useCallback(() => {
		setShowSignIn(true);
	}, []);

	return (
		<div className="min-h-screen bg-white flex flex-col">
			<header className="border-b border-gray-200 px-8 py-4">
				<img alt="logo" className="h-8" src="/matakota.svg" />
			</header>
			<main className="flex-1 flex px-4 md:px-8">
				<section className="mx-auto grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2 overflow-hidden items-center">
					<div className="hidden lg:flex lg:items-center lg:justify-center relative p-10 h-full">
						{/* Background decorative circles */}
						<div className="absolute w-[400px] h-[400px] rounded-full bg-[#fcf6e5] top-0 right-10 -z-10" />
						<div className="absolute w-[300px] h-[300px] rounded-full bg-[#fcf6e5] bottom-10 -left-10 -z-10" />
						<div className="flex w-full max-w-sm flex-col items-center gap-8 text-center z-10">
							<img
								alt="icon"
								className="w-full object-contain drop-shadow-xl"
								src="/matako-auth.png"
							/>
						</div>
					</div>
					<div className="flex min-h-[500px] items-center justify-center p-6 sm:p-10">
						<div className="w-full max-w-md">
							<div className="mb-10 flex flex-col gap-4">
								<h1 className="font-bold text-4xl text-primary-500 tracking-tight flex items-center flex-wrap gap-x-2 leading-tight">
									Selamat datang di
									<img
										alt="matakota"
										className="h-10 mt-1"
										src="/matakota.svg"
									/>
								</h1>
								<p className="text-primary-400 text-base font-medium">
									Yuk, masuk ke akunmu untuk mulai memantau situasi kota hari
									ini.
								</p>
							</div>

							{showSignIn ? (
								<SignInForm onSwitchToSignUp={showSignUpForm} />
							) : (
								<SignUpForm onSwitchToSignIn={showSignInForm} />
							)}
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
