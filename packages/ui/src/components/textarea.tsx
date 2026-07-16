import { cn } from "@mata-kota/ui/lib/utils";
import type * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			className={cn(
				"field-sizing-content flex min-h-[100px] w-full resize-none rounded-xl border border-primary-500 bg-transparent px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus-visible:border-primary-600 focus-visible:ring-1 focus-visible:ring-primary-600/50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-sm",
				className
			)}
			data-slot="textarea"
			{...props}
		/>
	);
}

export { Textarea };
