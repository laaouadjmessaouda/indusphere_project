import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Role from '@/models/Role'
import { ALL_PERMISSIONS } from '@/lib/permissions'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ success: false }, { status: 401 })

    await connectDB()

    const user = await User.findById(session.user.id).populate('roleId')

    // مستخدم بدون دور = Admin كامل
    if (!user || !user.roleId) {
      return NextResponse.json({ 
        success: true, 
        permissions: [...ALL_PERMISSIONS],
        isAdmin: true,
      })
    }

    const role = user.roleId as { name: string; permissions: string[] }
    const isAdmin = role.name === 'Admin' || role.permissions?.includes('*');
    
    return NextResponse.json({ 
      success: true, 
      permissions: role.permissions,
      isAdmin: isAdmin,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}