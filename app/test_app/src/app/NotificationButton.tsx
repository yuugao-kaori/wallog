'use client'

import React, { useState } from 'react'

export default function NotificationButton() {
  const [isNotified, setIsNotified] = useState(false)

  const handleClick = () => {
    setIsNotified(true)
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded"
    >
      {isNotified ? '通知をしました' : '通知する'}
    </button>
  )
}