import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
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

    // الحقول المسموح بتحديثها
    const allowedFields = ['email', 'roleId', 'isActive', 'name', 'position', 'specialization', 'phoneNumber'];
    const updateData: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const user = await User.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('roleId', 'name');

    if (!user) {
      return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 });
    }

    // إزالة passwordHash من الاستجابة
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    return NextResponse.json({ success: true, data: userResponse });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('Error updating user:', error);
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

    // منع حذف المستخدم نفسه
    if (id === session.user.id) {
      return NextResponse.json({ success: false, message: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 });
    }

    const user = await User.findOneAndDelete({ _id: id, tenantId: session.user.tenantId });

    if (!user) {
      return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('Error deleting user:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}