import { cn } from "@mata-kota/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

const chipVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default:
					"border border-primary-500 text-primary-500 bg-transparent hover:bg-primary-500 hover:text-white data-[state=selected]:bg-primary-500 data-[state=selected]:text-white",
			},
		},
	}
);

export interface ChipProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof chipVariants> {
	selected?: boolean;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
	({ className, variant, selected, ...props }, ref) => (
		<button
			className={cn(chipVariants({ className, variant }))}
			data-state={selected ? "selected" : "unselected"}
			ref={ref}
			type="button"
			{...props}
		/>
	)
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
