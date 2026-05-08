import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import Role from '@/models/Role';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
    }

    await connectDB();
    
    const roles = await Role.find({ tenantId: session.user.tenantId }).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: roles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('GET /api/roles error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
    }

    await connectDB();
    
    const body = await request.json();
    const { name, permissions } = body;
    
    if (!name) {
      return NextResponse.json({ success: false, message: 'اسم الدور مطلوب' }, { status: 400 });
    }
    
    const role = await Role.create({
      name,
      permissions: permissions || [],
      tenantId: session.user.tenantId,
      isDefault: false,
    });
    
    return NextResponse.json({ success: true, data: role });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('POST /api/roles error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}