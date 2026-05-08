import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import Role from '@/models/Role';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'معرف غير صالح' }, { status: 400 });
    }

    const { name, permissions } = body;

    const role = await Role.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      { $set: { name, permissions } },
      { new: true, runValidators: true }
    );

    if (!role) {
      return NextResponse.json({ success: false, message: 'الدور غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('Error updating role:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'معرف غير صالح' }, { status: 400 });
    }

    // منع حذف الأدوار الافتراضية (Admin, Viewer, etc)
    const role = await Role.findOne({ _id: id, tenantId: session.user.tenantId });
    
    if (!role) {
      return NextResponse.json({ success: false, message: 'الدور غير موجود' }, { status: 404 });
    }
    
    if (role.name === 'Admin' || role.name === 'Viewer') {
      return NextResponse.json({ success: false, message: 'لا يمكن حذف دور النظام' }, { status: 400 });
    }

    await Role.findOneAndDelete({ _id: id, tenantId: session.user.tenantId });

    return NextResponse.json({ success: true, message: 'تم حذف الدور بنجاح' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('Error deleting role:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}