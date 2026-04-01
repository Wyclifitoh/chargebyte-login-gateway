import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import loginBg from "@/assets/login-bg.jpg";
import logo from "@/assets/chargebyte-logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setErrors({ general: result.error || "Invalid email or password" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl">
        {/* Left Panel */}
        <div className="hidden w-5/12 flex-col justify-between bg-login-panel p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <img src={logo} alt="ChargeByte Logo" width={48} height={48} />
              <span className="text-2xl font-bold text-primary">ChargeByte</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight text-login-panel-foreground mb-4">
              Power Your EV Network
            </h1>
            <p className="text-login-panel-foreground/70 leading-relaxed">
              Manage your charging infrastructure, monitor stations, track revenue, and grow your network — all from one powerful dashboard.
            </p>
            <div className="mt-8 space-y-2 text-sm text-login-panel-foreground/50">
              <p>Demo accounts (any password):</p>
              <p>• superadmin@chargebyte.com</p>
              <p>• admin@chargebyte.com</p>
              <p>• staff@chargebyte.com</p>
              <p>• partner@chargebyte.com</p>
              <p>• adclient@chargebyte.com</p>
            </div>
          </div>
          <p className="text-login-panel-foreground/40 text-sm">
            © {new Date().getFullYear()} ChargeByte. All rights reserved.
          </p>
        </div>

        {/* Right Panel */}
        <div className="relative flex w-full flex-col items-center justify-center lg:w-7/12">
          <img src={loginBg} alt="" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-foreground/80 backdrop-blur-sm" />

          <div className="relative z-10 w-full max-w-md px-8 py-12">
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <img src={logo} alt="ChargeByte Logo" width={40} height={40} />
              <span className="text-xl font-bold text-primary">ChargeByte</span>
            </div>

            <h2 className="text-2xl font-bold text-login-panel-foreground mb-2">Welcome back</h2>
            <p className="text-login-panel-foreground/60 mb-8">Sign in to your account to continue</p>

            {errors.general && (
              <div className="mb-6 rounded-lg bg-destructive/20 border border-destructive/30 p-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-login-panel-foreground/40" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                    className="pl-10 bg-login-panel-foreground/10 border-login-panel-foreground/20 text-login-panel-foreground placeholder:text-login-panel-foreground/40 focus-visible:ring-primary h-12"
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-login-panel-foreground/40" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
                    className="pl-10 pr-10 bg-login-panel-foreground/10 border-login-panel-foreground/20 text-login-panel-foreground placeholder:text-login-panel-foreground/40 focus-visible:ring-primary h-12"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-login-panel-foreground/40 hover:text-login-panel-foreground/70 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-end">
                <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary text-accent-foreground hover:bg-primary/90 font-semibold text-base transition-all">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
