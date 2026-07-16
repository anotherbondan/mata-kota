"use client";

import { Building2, MapPinned, ShieldCheck } from "lucide-react";
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
		<main className="min-h-full bg-muted/30 px-4 pt-12 md:px-8">
			<section className="mx-auto grid min-h-[calc(100svh-9rem)] w-full max-w-6xl grid-cols-2 overflow-hidden rounded-lg">
				<div className="hidden border-lg lg:flex lg:items-center lg:justify-center lg:p-10">
					<div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
						<div className="relative flex aspect-square w-full max-w-72 items-center justify-center rounded-lg border bg-muted">
							<div className="absolute inset-8 rounded-full border border-primary/25" />
							<div className="absolute top-10 flex size-20 items-center justify-center rounded-full border bg-background shadow-sm">
								<ShieldCheck />
							</div>
							<div className="absolute right-14 bottom-16 flex size-12 items-center justify-center rounded-full border bg-background shadow-sm">
								<MapPinned />
							</div>
							<div className="absolute bottom-16 left-14 flex size-12 items-center justify-center rounded-full border bg-background shadow-sm">
								<Building2 />
							</div>
							<div className="mt-16 flex h-28 w-36 items-end justify-center rounded-t-full border bg-background shadow-sm">
								<div className="mb-8 flex gap-5">
									<span className="size-3 rounded-full bg-primary" />
									<span className="size-3 rounded-full bg-primary" />
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="flex min-h-[34rem] items-center justify-center p-6 sm:p-10">
					<div className="w-full max-w-md">
						<div className="mb-8 flex flex-col gap-3">
							<div className="flex items-center gap-2 font-semibold text-primary">
								<ShieldCheck />
								<span>Mata Kota</span>
							</div>
							<div className="flex flex-col gap-2">
								<h1 className="font-semibold text-2xl tracking-tight">
									{showSignIn ? "Welcome back" : "Create your account"}
								</h1>
								<p className="text-muted-foreground text-sm">
									{showSignIn
										? "Sign in to continue monitoring city response intelligence."
										: "Set up access for the incident response workspace."}
								</p>
							</div>
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
	);
}
