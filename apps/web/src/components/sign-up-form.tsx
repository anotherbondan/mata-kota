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

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
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
			name: "",
			nrp: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: nrpToAuthEmail(value.nrp),
					name: value.name,
					password: value.password,
				},
				{
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
					onSuccess: () => {
						router.push("/dashboard");
						toast.success("Sign up successful");
					},
				}
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
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
					<form.Field name="name">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label htmlFor={field.name}>Name</Label>
								<Input
									autoComplete="name"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
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
					<form.Field name="nrp">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label htmlFor={field.name}>NRP</Label>
								<Input
									autoComplete="username"
									id={field.name}
									inputMode="numeric"
									maxLength={8}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									pattern="[0-9]{8}"
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
								<Label htmlFor={field.name}>Password</Label>
								<Input
									autoComplete="new-password"
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
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
							className="w-full"
							disabled={!canSubmit || isSubmitting}
							type="submit"
						>
							{isSubmitting ? "Submitting..." : "Sign Up"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-5 text-center">
				<Button onClick={onSwitchToSignIn} variant="ghost">
					Already have an account? Sign In
				</Button>
			</div>
		</div>
	);
}
