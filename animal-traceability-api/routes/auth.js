const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Configure Email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. Request OTP (Email only)
// 1. Request OTP (Email only)
router.post('/forgot-password', async (req, res) => {
    const { identifier } = req.body; 
    try {
        const user = await User.findOne({ email: identifier }); 
        if (!user) return res.status(404).json({ success: false, message: "Email not found." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOTP = otp;
        user.otpExpires = Date.now() + 600000; // 10 minutes
        await user.save();

        // --- UPDATED DESIGN STARTS HERE ---
        await transporter.sendMail({
            from: `"Santa Rosa Animal Traceability" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Verification Code',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 15px; overflow: hidden;">
                    <div style="background-color: #2e7d32; color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Security Verification</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Animal Disease Traceability System</p>
                    </div>
                    
                    <div style="padding: 40px 30px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #333; margin-top: 0;">Hello,</p>
                        <p style="font-size: 15px; color: #555; line-height: 1.6;">
                            We received a request to reset the password for your account. Please use the following 6-digit verification code to proceed:
                        </p>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <div style="display: inline-block; letter-spacing: 10px; font-size: 36px; font-weight: bold; color: #1b5e20; padding: 15px 30px; background-color: #f1f8e9; border: 2px dashed #2e7d32; border-radius: 10px;">
                                ${otp}
                            </div>
                        </div>
                        
                        <p style="font-size: 13px; color: #d32f2f; text-align: center; font-weight: bold;">
                            This code is valid for 10 minutes only.
                        </p>
                        
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                        
                        <p style="font-size: 12px; color: #888; line-height: 1.5;">
                            If you did not request this password reset, you can safely ignore this email. Someone may have entered your email address by mistake.
                        </p>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                        <p style="margin: 0; font-size: 11px; color: #999;">
                            © 2026 Santa Rosa City Laguna Animal Disease Traceability.<br>
                            Laguna, Philippines
                        </p>
                    </div>
                </div>
            `
        });
        res.json({ success: true, message: "Email sent." });
    } catch (err) {
        console.error("Email Error:", err);
        res.status(500).json({ success: false, message: "System error." });
    }
});

// 2. Verify OTP
router.post('/verify-otp', async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const user = await User.findOne({ email: identifier });
        if (user && user.resetOTP === otp && Date.now() < user.otpExpires) {
            return res.json({ success: true });
        }
        res.status(400).json({ success: false, message: "Invalid or expired code." });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 3. Reset Password
router.post('/reset-password', async (req, res) => {
    const { identifier, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({ email: identifier });
        if (!user || user.resetOTP !== otp) return res.status(400).json({ message: "Error." });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetOTP = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Error." });
    }
});

module.exports = router;