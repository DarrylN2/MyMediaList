'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'

export function ProfileDialog() {
  const { status, switchView, login, signup, logout, user } = useAuth()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'authenticated' && user) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="text-lg font-semibold">{user.username}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="destructive" className="w-full" onClick={logout}>
          Sign out
        </Button>
      </div>
    )
  }

  const isSignup = status === 'signup'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignup) {
        if (!form.username.trim()) {
          setError('Username is required')
        } else {
          await signup(form)
        }
      } else {
        await login(form.email, form.password)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const updateField =
    (field: 'username' | 'email' | 'password') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {isSignup && (
        <Input
          placeholder="Username"
          value={form.username}
          onChange={updateField('username')}
          required
        />
      )}
      <Input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={updateField('email')}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={updateField('password')}
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          className="font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => switchView(isSignup ? 'login' : 'signup')}
        >
          {isSignup ? 'Log in' : 'Create one'}
        </button>
      </p>
    </form>
  )
}
