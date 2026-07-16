import {
	isValidNrp,
	NRP_ERROR_MESSAGE,
	nrpToAuthEmail,
} from "@mata-kota/auth/nrp";
import { Button } from "@mata-kota/ui/components/button";
import { Input } from "@mata-kota/ui/components/input";
import { Label } from "@mata-kota/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const router = useRouter();
	const { isPending } = authClient.useSession();
	const selectSubmitState = useCallback(
		(state: { canSubmit: boolean; isSubmitting: boolean }) => ({
			canSubmit: state.canSubmit,
			isSubmitting: state.isSubmitting,
		}),
		[]
	);

	const form = useForm({
		defaultValues: {
			nrp: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: nrpToAuthEmail(value.nrp),
					password: value.password,
				},
				{
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
					onSuccess: () => {
						router.push("/dashboard");
						toast.success("Sign in successful");
					},
				}
			);
		},
		validators: {
			onSubmit: z.object({
				nrp: z.string().refine(isValidNrp, NRP_ERROR_MESSAGE),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();
		form.handleSubmit();
	};

	return (
		<div className="w-full">
			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<div>
					<form.Field name="nrp">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label
									className="font-semibold text-primary-500"
									htmlFor={field.name}
								>
									NRP <span className="text-red-500">*</span>
								</Label>
								<Input
									autoComplete="username"
									id={field.name}
									inputMode="numeric"
									maxLength={8}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									pattern="[0-9]{8}"
									placeholder="Type here"
									type="text"
									value={field.state.value}
								/>
								{field.state.meta.errors.map((error) => (
									<p className="text-destructive text-sm" key={error?.message}>
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<div>
					<form.Field name="password">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label
									className="font-semibold text-primary-500"
									htmlFor={field.name}
								>
									Password <span className="text-red-500">*</span>
								</Label>
								<Input
									autoComplete="current-password"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Type here"
									type="password"
									value={field.state.value}
								/>
								{field.state.meta.errors.map((error) => (
									<p className="text-destructive text-sm" key={error?.message}>
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<form.Subscribe selector={selectSubmitState}>
					{({ canSubmit, isSubmitting }) => (
						<Button
							className="w-full mt-2 h-12 text-base"
							disabled={!canSubmit || isSubmitting}
							type="submit"
						>
							{isSubmitting ? "Logging in..." : "Login"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-8 text-center text-primary-500 font-medium">
				Belum punya akun?{" "}
				<button
					className="text-secondary-500 hover:underline"
					onClick={onSwitchToSignUp}
					type="button"
				>
					Daftar
				</button>
			</div>
		</div>
	);
}
