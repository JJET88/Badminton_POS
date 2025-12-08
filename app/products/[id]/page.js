/* eslint-disable react-hooks/rules-of-hooks */
"use client"
import React from 'react'
import { useParams } from 'next/navigation'
import ProductDetail from '@/components/ProductDetails';

export default function page() {
  const { id } = useParams();
  return (
    <div>
       <ProductDetail id={id}/>
    </div>
  )
}
