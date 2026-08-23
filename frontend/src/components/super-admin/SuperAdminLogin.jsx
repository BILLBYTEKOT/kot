import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Lock, Mail, LogIn } from 'lucide-react';
import { useSuperAdminAuth } from '../../hooks/useSuperAdminAuth';

const SuperAdminLogin = ({ onLoginSuccess }) => {
  const { login, loading, error } = useSuperAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    const result = await login(username, password);
    if (result.success) {
      toast.success('Logged in successfully');
      onLoginSuccess();
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />Super Admin Login</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label htmlFor="username">Username</Label><div className="relative mt-1"><Mail className="absolute left-3 top-3 text-gray-400 w-4 h-4" /><Input id="username" type="text" placeholder="Enter admin username" value={username} onChange={(event) => setUsername(event.target.value)} className="pl-10" disabled={loading} /></div></div>
            <div><Label htmlFor="password">Password</Label><div className="relative mt-1"><Lock className="absolute left-3 top-3 text-gray-400 w-4 h-4" /><Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" disabled={loading} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-3 text-gray-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700" role="alert">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">{loading ? 'Logging in...' : <span className="flex items-center gap-2"><LogIn className="w-4 h-4" />Sign In</span>}</Button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-4">This is a restricted area for authorized administrators only</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminLogin;
