import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import Groq from 'groq-sdk'
import { connectDB } from '@/lib/mongodb'
import Asset from '@/models/Asset'
import WorkOrder from '@/models/WorkOrder'
import SparePart from '@/models/SparePart'
import Transaction from '@/models/Transaction'
import ProductionPlan from '@/models/ProductionPlan'
import Employee from '@/models/Employee'
import MaintenanceRequest from '@/models/MaintenanceRequest'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, message: 'API Key غير موجود' }, { status: 500 })

    // ✅ استخراج اللغة من الطلب
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || 'ar'

    await connectDB()
    const tenantId = session.user.tenantId

    const [
      totalAssets,
      activeAssets,
      openWorkOrders,
      completedWorkOrders,
      criticalWorkOrders,
      lowStockParts,
      totalParts,
      transactions,
      productionPlans,
      totalEmployees,
      maintenanceRequests,
    ] = await Promise.all([
      Asset.countDocuments({ tenantId }),
      Asset.countDocuments({ tenantId, status: 'operational' }),
      WorkOrder.countDocuments({ tenantId, status: { $in: ['open', 'in-progress'] } }),
      WorkOrder.countDocuments({ tenantId, status: 'completed' }),
      WorkOrder.countDocuments({ tenantId, priority: 'critical' }),
      SparePart.countDocuments({ tenantId, $expr: { $lte: ['$quantity', '$minStock'] } }),
      SparePart.countDocuments({ tenantId }),
      Transaction.find({ tenantId }).sort({ date: -1 }).limit(20),
      ProductionPlan.find({ tenantId }).limit(10),
      Employee.countDocuments({ tenantId, status: 'active' }),
      MaintenanceRequest.countDocuments({ tenantId, status: 'pending' }),
    ])

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const avgProduction = productionPlans.length > 0
      ? productionPlans.reduce((sum, p) => {
          const eff = p.targetQuantity > 0 ? (p.actualQuantity / p.targetQuantity) * 100 : 0
          return sum + eff
        }, 0) / productionPlans.length
      : 0

    const factoryData = {
      cmms: {
        totalAssets,
        activeAssets,
        assetAvailability: totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0,
        openWorkOrders,
        completedWorkOrders,
        criticalWorkOrders,
        maintenanceRequestsPending: maintenanceRequests,
        lowStockParts,
        totalParts,
        stockHealthPercentage: totalParts > 0 ? Math.round(((totalParts - lowStockParts) / totalParts) * 100) : 100,
      },
      erp: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        avgProductionEfficiency: Math.round(avgProduction),
        totalEmployees,
      },
    }

    const client = new Groq({ apiKey })

    // ✅ إعداد الـ Prompt حسب اللغة
    let promptText = ''
    let statusLabels = {}

    if (locale === 'ar') {
      statusLabels = {
        excellent: 'ممتاز',
        good: 'جيد',
        average: 'متوسط',
        poor: 'ضعيف'
      }
      promptText = `أنت محلل أعمال خبير في مصانع الأسمنت. بناءً على البيانات التالية لمصنع الأسمنت، قدم تقريراً تحليلياً شاملاً باللغة العربية:

${JSON.stringify(factoryData, null, 2)}

قدم التقرير بتنسيق JSON فقط بدون أي نص إضافي:
{
  "overallScore": 0-100,
  "overallStatus": "ممتاز|جيد|متوسط|ضعيف",
  "executiveSummary": "ملخص تنفيذي شامل في 3-4 جمل",
  "sections": [
    {
      "title": "عنوان القسم",
      "icon": "إيموجي",
      "score": 0-100,
      "status": "ممتاز|جيد|متوسط|ضعيف",
      "analysis": "تحليل تفصيلي",
      "highlights": ["نقطة إيجابية 1", "نقطة إيجابية 2"],
      "issues": ["مشكلة 1", "مشكلة 2"],
      "recommendations": ["توصية 1", "توصية 2"]
    }
  ],
  "topPriorities": ["أولوية 1", "أولوية 2", "أولوية 3"],
  "forecast": "توقعات للفترة القادمة"
}`
    } else if (locale === 'fr') {
      statusLabels = {
        excellent: 'Excellent',
        good: 'Bon',
        average: 'Moyen',
        poor: 'Faible'
      }
      promptText = `Vous êtes un expert en analyse d'entreprise spécialisé dans les cimenteries. Sur la base des données suivantes de la cimenterie, fournissez un rapport d'analyse complet en français:

${JSON.stringify(factoryData, null, 2)}

Fournissez le rapport au format JSON uniquement sans texte supplémentaire:
{
  "overallScore": 0-100,
  "overallStatus": "Excellent|Bon|Moyen|Faible",
  "executiveSummary": "Résumé exécutif complet en 3-4 phrases",
  "sections": [
    {
      "title": "Titre de la section",
      "icon": "emoji",
      "score": 0-100,
      "status": "Excellent|Bon|Moyen|Faible",
      "analysis": "Analyse détaillée",
      "highlights": ["Point positif 1", "Point positif 2"],
      "issues": ["Problème 1", "Problème 2"],
      "recommendations": ["Recommandation 1", "Recommandation 2"]
    }
  ],
  "topPriorities": ["Priorité 1", "Priorité 2", "Priorité 3"],
  "forecast": "Prévisions pour la période à venir"
}`
    } else {
      statusLabels = {
        excellent: 'Excellent',
        good: 'Good',
        average: 'Average',
        poor: 'Poor'
      }
      promptText = `You are an expert business analyst for cement factories. Based on the following cement factory data, provide a comprehensive analysis report in English:

${JSON.stringify(factoryData, null, 2)}

Provide the report in JSON format only without any additional text:
{
  "overallScore": 0-100,
  "overallStatus": "Excellent|Good|Average|Poor",
  "executiveSummary": "Executive summary in 3-4 sentences",
  "sections": [
    {
      "title": "Section title",
      "icon": "emoji",
      "score": 0-100,
      "status": "Excellent|Good|Average|Poor",
      "analysis": "Detailed analysis",
      "highlights": ["Highlight 1", "Highlight 2"],
      "issues": ["Issue 1", "Issue 2"],
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }
  ],
  "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
  "forecast": "Forecast for the upcoming period"
}`
    }

    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: promptText }],
      max_tokens: 2048,
      temperature: 0.4,
    })

    const text = response.choices[0]?.message?.content || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return NextResponse.json({ success: true, data: parsed, rawData: factoryData, locale })

  } catch (error: unknown) {
    console.error('Report Analysis Error:', error)
    const message = error instanceof Error ? error.message : 'خطأ غير معروف'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}