import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RefreshCw, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Alert from '../components/Alert';

const OTP_LENGTH = 6;
const COOLDOWN_SECONDS = 30;

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();

  // Retrieve email from navigation state or URL query parameter
  const initialEmail =
    location.state?.email ||
    new URLSearchParams(location.search).get('email') ||
    '';

  const [email, setEmail] = useState(initialEmail);
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(''));
  const [errors, setErrors] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ''
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(COOLDOWN_SECONDS);

  const inputRefs = useRef([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus the first input field on page load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Handle single digit input change
  const handleChange = (index, value) => {
    // Only accept numeric characters
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newOtp = [...otpValues];

    if (cleanValue.length > 1) {
      // User pasted multiple characters into a single box
      handlePasteValue(cleanValue);
      return;
    }

    newOtp[index] = cleanValue;
    setOtpValues(newOtp);
    if (errors) setErrors('');

    // Auto-advance to next input if digit entered
    if (cleanValue && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key down (Backspace and Arrow keys)
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otpValues];
        newOtp[index] = '';
        setOtpValues(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle clipboard paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    handlePasteValue(pasteData);
  };

  const handlePasteValue = (pastedText) => {
    const digits = pastedText.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;

    const newOtp = [...otpValues];
    for (let i = 0; i < digits.length; i++) {
      newOtp[i] = digits[i];
    }
    setOtpValues(newOtp);
    if (errors) setErrors('');

    const nextIndex = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  // Verify OTP submission
  const handleVerify = async (e) => {
    e?.preventDefault();
    setErrors('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrors('Email address is missing. Please return to registration or sign in.');
      return;
    }

    const fullOtp = otpValues.join('');
    if (fullOtp.length !== OTP_LENGTH) {
      setErrors(`Please enter all ${OTP_LENGTH} digits of your verification code.`);
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyOtp(email.trim(), fullOtp);

      if (result.success) {
        setSuccessMessage('Email verified successfully! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setErrors(result.message);
      }
    } catch {
      setErrors('An unexpected error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP handler
  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setErrors('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrors('Email address is missing. Please sign in or register.');
      return;
    }

    setIsResending(true);

    try {
      const result = await resendOtp(email.trim());

      if (result.success) {
        setSuccessMessage(result.message || 'A new verification code has been sent!');
        setCountdown(COOLDOWN_SECONDS);
        // Clear previous input
        setOtpValues(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        setErrors(result.message);
        if (result.remainingSeconds) {
          setCountdown(result.remainingSeconds);
        }
      }
    } catch {
      setErrors('Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">
            <ShieldCheck size={14} /> Email Verification
          </span>
          <h1 className="auth-title">Verify Your Email</h1>
          <p className="auth-subtitle">
            We sent a verification code to:
            <br />
            <strong style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>
              {email || 'your email'}
            </strong>
          </p>
        </div>

        <Alert type="error" message={errors} onClose={() => setErrors('')} />
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />

        <form onSubmit={handleVerify} className="auth-form" noValidate>
          {/* OTP Digit Input Boxes */}
          <div className="otp-container" onPaste={handlePaste}>
            {otpValues.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`otp-digit-input ${errors ? 'has-error' : ''}`}
                aria-label={`Digit ${index + 1} of verification code`}
                disabled={isVerifying}
              />
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={isVerifying}
            loadingText="Verifying..."
            icon={ArrowRight}
            disabled={otpValues.join('').length !== OTP_LENGTH}
          >
            Verify OTP
          </Button>

          {/* Resend OTP Section */}
          <div className="otp-resend-box">
            <span className="otp-resend-label">Didn't receive the code?</span>
            {countdown > 0 ? (
              <span className="otp-countdown-badge">
                Resend available in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResend}
                disabled={isResending}
              >
                <RefreshCw size={14} className={isResending ? 'spinning' : ''} />
                <span>{isResending ? 'Sending...' : 'Resend OTP'}</span>
              </button>
            )}
          </div>
        </form>

        <div className="auth-footer" style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
