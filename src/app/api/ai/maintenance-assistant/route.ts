import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import Groq from 'groq-sdk'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'API Key غير موجود' }, { status: 500 })
    }

    const client = new Groq({ apiKey })

    const { message, history } = await request.json()

    const systemPrompt = `أنت مساعد صيانة ذكي متخصص في مصانع الأسمنت. مهمتك مساعدة فرق الصيانة في تشخيص الأعطال واقتراح الحلول.

عند تلقي وصف مشكلة، قدم إجابتك بهذا التنسيق:

## 🔍 التشخيص
[تحليل المشكلة]

## ⚠️ الأسباب المحتملة
- [سبب 1]
- [سبب 2]
- [سبب 3]

## 🔧 الحلول المقترحة
- [حل 1]
- [حل 2]

## 🔩 قطع الغيار المطلوبة
- [قطعة 1 مع المواصفات]
- [قطعة 2 مع المواصفات]

## 🚨 مستوى الأولوية
[عاجل/عالي/متوسط/منخفض] — [السبب]

## ⏱️ الوقت التقديري للإصلاح
[المدة التقديرية]

كن دقيقاً ومختصراً. استخدم المصطلحات التقنية المناسبة لمصانع الأسمنت.`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // ✅ استخدم نموذجاً متوفراً
    const response = await client.chat.completions.create({
      model: 'llama-3.1-70b-versatile',  // ✅ تم التعديل هنا
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    })

    const text = response.choices[0]?.message?.content || 'لم أتمكن من توليد إجابة'

    return NextResponse.json({ success: true, message: text })

  } catch (error: unknown) {
    console.error('AI Error:', error)
    const message = error instanceof Error ? error.message : 'خطأ غير معروف'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}