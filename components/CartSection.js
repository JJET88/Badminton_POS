"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import emptyCartImg from "../assets/empty-cart.svg";

import Cart from "./Cart";
import useCartStore from "@/app/store/useCartStore";
import useProductStore from "@/app/store/useProductStore";
import CartHeader from "./CartHeader";
import { useToggle } from "@/context/ToggleContext";
import CheckoutSection from "./CheckoutSection";

const CartSection = () => {
	const { open, openSection, closeSection } = useToggle();

	const { carts, clearCart } = useCartStore();
	const { products, fetchProducts } = useProductStore();

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	// ----- CALCULATIONS -----
	const subtotal = carts.reduce((acc, cart) => {
		const product = products.find((p) => p.id === cart.productId);
		return acc + (product?.price || 0) * cart.quantity;
	}, 0);
	let discount = 0;

	const afterDiscount = subtotal - discount;
	const tax = afterDiscount * 0.1;
	const total = afterDiscount + tax;

	// =============================
	//            UI
	// =============================

	return (
		<>
			<div className="bg-gray-50 min-h-screen">
				{/* MAIN CART SECTION */}
				<section
					className={`flex flex-col min-h-screen bg-gray-50 max-w-7xl mx-auto transition-all duration-300 
            ${open ? "z-[-1] blur-sm" : "z-0 blur-0"}`}
				>
					<CartHeader />

					{carts.length === 0 ? (
						<div className="flex flex-col items-center justify-center mt-20">
							<Image
								src={emptyCartImg}
								alt="Empty Cart"
								width={200}
								height={200}
							/>
							<p className="text-lg text-gray-600 mt-4">
								Your cart is empty 😔
							</p>
							<Link
								href="/products"
								className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
							>
								Shop Now
							</Link>
						</div>
					) : (
						<>
							<div className="flex-grow space-y-4 pb-40">
								{carts.map((cart) => (
									<Cart key={cart.id} cart={cart} />
								))}
							</div>

							{/* SUMMARY FOOTER */}
							<div className="sticky bottom-0 w-full bg-white shadow p-4 rounded-t-lg">
								<div className="grid grid-cols-3 gap-4 text-sm">
									<div className="text-center">
										<p className="text-gray-500">Subtotal</p>
										<p className="font-semibold">${subtotal.toFixed(2)}</p>
									</div>
									<div className="text-center">
										<p className="text-gray-500">Tax (10%)</p>
										<p className="font-semibold">${tax.toFixed(2)}</p>
									</div>
									<div className="text-center">
										<p className="text-gray-500">Total</p>
										<p className="text-xl font-bold text-green-600">
											${total.toFixed(2)}
										</p>
									</div>
								</div>

								<button
									onClick={openSection}
									className="mt-4 w-full bg-green-600 text-white py-2 rounded-full hover:bg-green-700"
								>
									Proceed to Checkout 💳
								</button>
							</div>
						</>
					)}
				</section>

				{/* checkout section */}
				<CheckoutSection />
			</div>
		</>
	);
};

export default CartSection;
