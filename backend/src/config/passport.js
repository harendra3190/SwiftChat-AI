// src/config/passport.js — Passport JWT + Google OAuth strategies
const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const User = require("../models/User.model");
const logger = require("./logger");
const { redisClient } = require("./redis");

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "fallback_jwt_secret",
      passReqToCallback: true,
    },
    async (req, payload, done) => {
      try {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (token) {
          try {
            const isBlacklisted = await redisClient.get(`bl_token:${token}`);
            if (isBlacklisted) {
              return done(null, false, { message: "Token blacklisted" });
            }
          } catch (redisErr) {
            // Redis unavailable — skip blacklist check, allow request
            logger.warn("Redis unavailable, skipping blacklist check");
          }
        }

        const user = await User.findById(payload.sub);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

// ─── Google OAuth Strategy ────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            user = await User.create({
              email: profile.emails[0].value,
              username: profile.displayName.replace(/\s+/g, "_").toLowerCase(),
              passwordHash: "",
              avatarUrl: profile.photos[0]?.value || null,
              provider: "google",
              providerId: profile.id,
            });
          }
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      },
    ),
  );
} else {
  logger.warn("Google OAuth not configured — skipping strategy");
}
