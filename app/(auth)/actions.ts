'use server'

import { createUser, getUser } from '@/lib/db/queries'
import { z } from 'zod'

import { signIn } from './auth'

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data'
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    })

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    })

    return { status: 'success' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' }
    }

    return { status: 'failed' }
  }
}

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data'
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  console.log('🚀 Register function started')

  try {
    const email = formData.get('email')
    const password = formData.get('password')
    console.log('📝 Form data:', { email, password: password ? '***' : null })

    const validatedData = authFormSchema.parse({
      email,
      password,
    })
    console.log('✅ Data validation passed:', { email: validatedData.email })

    console.log('🔍 Checking if user exists...')
    const users = await getUser(validatedData.email)
    console.log('📊 User query result:', { count: users.length, users })

    if (users.length > 0) {
      console.log('❌ User already exists')
      return { status: 'user_exists' } as RegisterActionState
    }

    console.log('👤 Creating new user...')
    await createUser(validatedData.email, validatedData.password)
    console.log('✅ User created successfully')

    console.log('🔐 Attempting to sign in...')
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    })
    console.log('✅ Sign in successful')

    return { status: 'success' }
  } catch (error) {
    console.error('💥 Register error:', error)

    if (error instanceof z.ZodError) {
      console.log('❌ Validation error:', error.errors)
      return { status: 'invalid_data' }
    }

    console.log('❌ Unknown error:', error)
    return { status: 'failed' }
  }
}
