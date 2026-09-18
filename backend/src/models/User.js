import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return password by default
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false, // Do not expose hashed OTP in queries
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
    otpLastSentAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpiresAt;
        delete ret.otpLastSentAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Set hashed OTP with configurable expiration
userSchema.methods.setOtp = function (plainOtp, expiryMinutes = 10) {
  const hashedOtp = crypto.createHash('sha256').update(String(plainOtp).trim()).digest('hex');
  this.otp = hashedOtp;
  this.otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  this.otpLastSentAt = new Date();
};

// Verify OTP against stored hash and check expiration
userSchema.methods.verifyOtp = function (enteredOtp) {
  if (!this.otp || !this.otpExpiresAt) {
    return { valid: false, reason: 'NO_OTP' };
  }

  if (new Date() > this.otpExpiresAt) {
    return { valid: false, reason: 'EXPIRED' };
  }

  const hashedEntered = crypto.createHash('sha256').update(String(enteredOtp).trim()).digest('hex');
  if (hashedEntered !== this.otp) {
    return { valid: false, reason: 'MISMATCH' };
  }

  return { valid: true };
};

// Clear OTP upon successful verification
userSchema.methods.clearOtp = function () {
  this.otp = undefined;
  this.otpExpiresAt = undefined;
};

const User = mongoose.model('User', userSchema);

export default User;
