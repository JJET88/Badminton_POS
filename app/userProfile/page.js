"use client"


import UserProfile from '@/components/UserProfile'
import { useParams } from 'next/navigation';
import React from 'react'

export default function page() {
   // eslint-disable-next-line react-hooks/rules-of-hooks
   const { id } = useParams();
  
  return (
    <div>
      <UserProfile id={id}/>
    </div>
  )
}
