import { NextResponse, type NextRequest } from 'next/server'

// Phase 5 will implement full notification logic:
// - 3+ stress sessions in a day
// - Monday morning pattern
// - Thursday afternoon pattern
// - Weekly positive milestone
export async function POST(_request: NextRequest) {
  return NextResponse.json({ created: 0 })
}
