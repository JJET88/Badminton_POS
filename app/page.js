"use client"
import React from 'react'
import ProductList from '@/components/ProductList'
import AccessDeny from '@/components/AccessDeny'
import PurchaseHistory from '@/components/PurchaseHistory'
import UserDashboard from '@/components/UserDashboard'


export default function page() {
  return (
    <div>
      {/* <AccessDeny/> */}
      <ProductList />
      {/* <PurchaseHistory/> */}
      {/* <UserDashboard/> */}
     
    </div>
  )
}

