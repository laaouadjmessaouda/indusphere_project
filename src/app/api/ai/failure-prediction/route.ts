import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import Groq from 'groq-sdk'
import { connectDB } from '@/lib/mongodb'
import Asset from '@/models/Asset'
import WorkOrder from '@/models/WorkOrder'
import PreventiveMaintenance from '@/models/PreventiveMaintenance'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, message: 'API Key غير موجود' }, { status: 500 })

    await connectDB()
    const tenantId = session.user.tenantId

    // جلب بيانات الأصول
    const assets = await Asset.find({ tenantId }).limit(20)
    
    // جلب أوامر العمل لكل أصل
    const assetsData = await Promise.all(assets.map(async (asset) => {
      const workOrders = await WorkOrder.find({ 
        tenantId, 
        assetId: asset._id,
      }).sort({ createdAt: -1 }).limit(10)

      const preventive = await PreventiveMaintenance.findOne({
        tenantId,
        assetId: asset._id,
      }).sort({ lastDone: -1 })

      const daysSinceLastMaintenance = preventive?.lastDone
        ? Math.floor((Date.now() - new Date(preventive.lastDone).getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        id: asset._id.toString(),
        name: asset.name,
        category: asset.category,
        location: asset.location,
        status: asset.status,
        workOrdersCount: workOrders.length,
        recentWorkOrders: workOrders.slice(0, 3).map(wo => ({
          title: wo.title,
          priority: wo.priority,
          status: wo.status,
          date: wo.createdAt,
        })),
        daysSinceLastMaintenance,
      }
    }))

    // إرسال البيانات للـ AI
    const client = new Groq({ apiKey })

    const prompt = `أنت خبير صيانة في مصانع الأسمنت. بناءً على البيانات التالية للأصول، قدم تحليل تنبؤي للأعطال:

${JSON.stringify(assetsData, null, 2)}

قدم إجابتك بتنسيق JSON فقط بدون أي نص إضافي:
{
  "predictions": [
    {
      "assetId": "id الأصل",
      "assetName": "اسم الأصل",
      "riskLevel": "critical|high|medium|low",
      "riskPercentage": 0-100,
      "reasons": ["سبب 1", "سبب 2"],
      "recommendation": "التوصية المقترحة",
      "urgency": "فوري|خلال أسبوع|خلال شهر|منخفض"
    }
  ],
  "summary": "ملخص عام عن حالة الأصول"
}`

    const response = await client.chat.completions.create({
      model: 'llama3-70b-8192', // ✅ تم التعديل هنا
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    })

    const text = response.choices[0]?.message?.content || '{}'
    
    // تنظيف الـ JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { predictions: [], summary: '' }

    return NextResponse.json({ success: true, data: parsed })

  } catch (error: unknown) {
    console.error('AI Prediction Error:', error)
    const message = error instanceof Error ? error.message : 'خطأ غير معروف'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}