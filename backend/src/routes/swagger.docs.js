/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Users
 *     description: User management and operations
 * 
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User successfully registered
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already exists
 * 
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 * 
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Details of current user
 *       401:
 *         description: Unauthorized
 * 
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       400:
 *         description: Refresh token missing or invalid
 * 
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out user and blacklist tokens
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 * 
 * /users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: List of standard users
 * 
 * /users/connects:
 *   get:
 *     tags: [Users]
 *     summary: Get user connections (followers/following)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: connections details
 * 
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a standard user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 * 
 * /users/update:
 *   put:
 *     tags: [Users]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User updated
 * 
 * /users/follow/{id}:
 *   post:
 *     tags: [Users]
 *     summary: Follow or unfollow a user (toggle logic)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user ID to follow/unfollow
 *     responses:
 *       200:
 *         description: Interaction synchronized
 *
 * /users/settings:
 *   patch:
 *     tags: [Users]
 *     summary: Update neural settings (AI insights, privacy, notifications)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               aiInsights:
 *                 type: boolean
 *               isPrivate:
 *                 type: boolean
 *               notifications:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings persisted
 *
 * /interactions/insights:
 *   get:
 *     tags: [Interactions]
 *     summary: Get live Cognitive Insights and Flow State metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insights aggregation schema returned
 *
 * /ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Chat with ARIA AI guide (Identity-Grounded)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: object
 *                 description: Identity grounding and platform context
 *     responses:
 *       200:
 *         description: AI response generated
 */
