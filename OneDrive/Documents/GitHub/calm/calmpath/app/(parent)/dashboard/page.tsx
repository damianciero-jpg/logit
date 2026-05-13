'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { createClient } from '@/lib/supabase'
import CalmPathDashboardRaw from '@/components/calmpath-dashboard'
import type { Child } from '@/types/database'

type DashboardProps = { childId: string; childName: string; childAge: number; childAvatar: string; childColor: string }
const CalmPathDashboard = CalmPathDashboardRaw as unknown as React.ComponentType<DashboardProps>

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading]           = useState(true)
  const [children, setChildren]         = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase
        .from('children')
        .select('*')
        .order('created_at')
        .then(({ data }) => {
          const kids = (data ?? []) as Child[]
          setChildren(kids)
          if (kids.length >= 1) setSelectedChild(kids[0])
          setLoading(false)
        })
    })
  }, [router])

  if (loading) return (
    <>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
      <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:'2rem', animation:'bounce 1.2s ease-in-out infinite' }}>📊</div>
      </div>
    </>
  )

  if (!selectedChild) return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif" }}>
      <div style={{ textAlign:'center', color:'#94A3B8' }}>
        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>👨‍👩‍👧</div>
        <div style={{ fontSize:'1rem' }}>No children found on this account.</div>
        <div style={{ fontSize:'0.85rem', marginTop:'4px' }}>Ask a parent to set up the app first.</div>
      </div>
    </div>
  )

  return (
    <>
      {children.length > 1 && (
        <div style={{ background:'white', borderBottom:'1px solid #E2E8F0', padding:'0.5rem 1.5rem', display:'flex', gap:'8px', overflowX:'auto' }}>
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              style={{
                padding:'6px 16px', borderRadius:'20px', border:'none', cursor:'pointer',
                background: selectedChild.id === child.id ? child.color : '#F1F5F9',
                color: selectedChild.id === child.id ? 'white' : '#374151',
                fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'0.82rem',
                transition:'all 0.15s', display:'flex', alignItems:'center', gap:'6px',
                flexShrink:0,
              }}
            >
              <span>{child.avatar}</span> {child.name}
            </button>
          ))}
        </div>
      )}
      <CalmPathDashboard
        childId={selectedChild.id}
        childName={selectedChild.name}
        childAge={selectedChild.age}
        childAvatar={selectedChild.avatar}
        childColor={selectedChild.color}
      />
    </>
  )
}
