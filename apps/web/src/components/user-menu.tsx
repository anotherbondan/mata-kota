import { authEmailToNrp } from "@mata-kota/auth/nrp";
import { Button } from "@mata-kota/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@mata-kota/ui/components/dropdown-menu";
import { Skeleton } from "@mata-kota/ui/components/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const handleSignOut = useCallback(() => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					router.push("/");
				},
			},
		});
	}, [router]);

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		return (
			<Link href="/login">
				<Button variant="tertiary">Sign In</Button>
			</Link>
		);
	}

	const nrp = authEmailToNrp(session.user.email);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						className="flex items-center gap-3 outline-none cursor-pointer hover:opacity-90 transition-opacity"
						type="button"
					/>
				}
			>
				<span className="text-[#f59e0b] font-semibold text-[15px]">
					Hi, {session.user.name?.split(" ")[0] || "User"}!
				</span>
				<div className="h-10 w-10 rounded-full bg-amber-500 shadow-sm shrink-0" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My Account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>NRP: {nrp ?? "Unavailable"}</DropdownMenuItem>
					<DropdownMenuItem onClick={handleSignOut} variant="destructive">
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
