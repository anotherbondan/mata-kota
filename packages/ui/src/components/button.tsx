import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@mata-kota/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
	"group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full border border-transparent bg-clip-padding font-medium outline-none transition-all focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		defaultVariants: {
			size: "medium",
			variant: "primary",
		},
		variants: {
			size: {
				large: "h-12 px-8 text-base gap-2.5",
				medium: "h-10 px-6 text-sm gap-2",
				small: "h-8 px-4 text-xs gap-1.5",
			},
			variant: {
				ghost: "bg-transparent text-primary-500 hover:bg-primary-50",
				primary: "bg-primary-500 text-white hover:bg-primary-600",
				secondary: "bg-secondary-500 text-white hover:bg-secondary-600",
				tertiary:
					"border-primary-500 text-primary-500 bg-transparent hover:bg-primary-50",
			},
		},
	}
);

function Button({
	className,
	variant = "primary",
	size = "medium",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			className={cn(buttonVariants({ className, size, variant }))}
			data-slot="button"
			{...props}
		/>
	);
}

export { Button, buttonVariants };
