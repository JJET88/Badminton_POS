/* eslint-disable react-hooks/rules-of-hooks */
"use client"
import React from 'react'
import { useParams } from 'next/navigation'
import ProductEditForm from '@/components/ProductEditForm';

export default function page() {
  const { id } = useParams();
  return (
    <div>
      <ProductEditForm id={id} />
    </div>
  )
}
