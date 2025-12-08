"use client";

import { useToggle } from "@/context/ToggleContext";

export default function ToggleButton() {
	const { toggle } = useToggle();

	return (
		<button
			onClick={toggle}
			className="px-4 py-2 bg-blue-600 text-white rounded-lg"
		>
			Toggle Payment Section
		</button>
	);
}
