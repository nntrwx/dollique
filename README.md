# Dollique API 🧸✨

> **Dollique** is a specialized Q&A knowledge-sharing platform and community backend designed for doll customizers, OOAK (One Of A Kind) artists, and action figure / anime scale figure collectors.

Developed as Part 1 (Backend API) of the **USOF Challenge** (Full Stack Track).

---

## 📖 About the Project

Dollique enables creators and collectors to ask technical questions (materials, sealants, hair rerooting, joint repairs), share restoration guides, identify vintage releases, perform authenticity legit checks, and receive community feedback.

### Key Architectural Highlights:
- **MVC Architecture & OOP:** Strict separation of Models, Views (standardized JSON responses), and Controllers using ES6 Classes.
- **SOLID Principles:** Single-responsibility services (automated reputation rating calculation, simulated/SMTP email verification).
- **Relational Integrity (MySQL + Prisma):** Cascade deletions, composite unique indexes (preventing multiple votes per entity), and many-to-many post categorization.
- **Role-Based Access Control (RBAC):** Distinct permissions for `user` and `admin` roles.
- **Security:** Passwords securely hashed with `bcrypt`, stateless authentication via `JWT`, input validation, and email confirmation requirement before login.
- **Local Storage:** Avatars and post images stored on the server's local file system via `multer`.

---

## 🛠 Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MySQL
- **ORM:** Prisma ORM
- **Authentication:** JSON Web Tokens (JWT) & bcrypt
- **File Uploads:** Multer
- **Mailing:** Nodemailer

---

## 📂 Project Structure

```text
dollique/
├── prisma/
│   ├── schema.prisma          # Database schema & relations
│   └── seed.js                # Initial database seed (5+ entries per entity)
├── src/
│   ├── controllers/           # HTTP Request Handlers (MVC: Controller)
│   │   ├── authController.js
│   │   ├── categoryController.js
│   │   ├── commentController.js
│   │   ├── postController.js
│   │   └── userController.js
│   ├── models/                # Database abstraction classes (MVC: Model)
│   │   ├── CategoryModel.js
│   │   ├── CommentModel.js
│   │   ├── LikeModel.js
│   │   ├── PostModel.js
│   │   └── UserModel.js
│   ├── routes/                # Express API route declarations
│   ├── middlewares/           # JWT verification, Role check, Multer storage
│   ├── services/              # Business logic (Rating recalculation, Email delivery)
│   ├── prismaClient.js        # Shared PrismaClient instance
│   ├── app.js                 # Express application configuration
│   └── server.js              # Application entry point
├── uploads/                   # Local file storage
│   ├── avatars/
│   └── posts/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MySQL Server](https://www.mysql.com/) (running locally on port `3306`)

### 2. Clone and Install Dependencies
```bash
git clone [https://github.com/nntrwx/dollique.git](https://github.com/nntrwx/dollique.git)
cd dollique
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=3000
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/dollique_db"
JWT_SECRET="your_secure_jwt_secret_key"

# Optional: Nodemailer SMTP Configuration
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_gmail_app_password"
```

### 4. Database Setup & Seeding
Push the schema to MySQL and populate it with initial realistic data:
```bash
# Push Prisma schema to MySQL
npm run db:push

# Run seed script (creates 5+ users, categories, posts, comments, likes)
node prisma/seed.js
```

### 5. Run the Server
```bash
# Development mode (with nodemon auto-restart)
npm run dev

# Production start
npm start
```
The server will start at `http://localhost:3000`.

---

## 📡 API Endpoints Overview

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new account (`[login, password, password_confirmation, email]`) | Public |
| `POST` | `/api/auth/confirm-email/:confirm_token` | Confirm email address via token | Public |
| `POST` | `/api/auth/login` | Authenticate user (`[login/email, password]`) | Public (Confirmed email) |
| `POST` | `/api/auth/logout` | Log out authorized user | Authenticated |
| `POST` | `/api/auth/password-reset` | Request password reset token via email | Public |
| `POST` | `/api/auth/password-reset/:confirm_token` | Set new password with confirmation token | Public |

### Users (`/api/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Get list of all users | Public |
| `GET` | `/api/users/:user_id` | Get user profile data | Public |
| `POST` | `/api/users` | Create user or admin (`[login, password, email, role]`) | Admin only |
| `PATCH`| `/api/users/avatar` | Upload the profile picture | Authenticated |
| `GET`  | `/api/users/:user_id/doll` | Profile doll as ordered PNG layers + `use_doll_as_avatar` | Public |
| `PATCH`| `/api/users/:user_id` | Update profile information | Owner / Admin |
| `DELETE`| `/api/users/:user_id` | Delete user account | Owner / Admin |

### Categories (`/api/categories`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Get all categories | Public |
| `GET` | `/api/categories/:category_id` | Get category details | Public |
| `GET` | `/api/categories/:category_id/posts` | Get all posts belonging to category | Public |
| `POST` | `/api/categories` | Create category (`[title, description]`) | Admin only |
| `PATCH`| `/api/categories/:category_id` | Update category details | Admin only |
| `DELETE`| `/api/categories/:category_id` | Delete category | Admin only |

### Posts (`/api/posts`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/posts` | List posts with pagination, sorting (`likes`, `date`) & filters | Public |
| `GET` | `/api/posts/favorites` | Get saved favorite posts for authenticated user | Authenticated |
| `GET` | `/api/posts/:post_id` | Get specific post data | Public |
| `POST` | `/api/posts` | Create new post with categories & optional images | Authenticated |
| `PATCH`| `/api/posts/:post_id` | Update post content (author) or status (admin) | Author / Admin |
| `DELETE`| `/api/posts/:post_id` | Delete post | Author / Admin |
| `POST` | `/api/posts/:post_id/favorite`| Toggle favorite post (save / unsave) | Authenticated |
| `GET` | `/api/posts/:post_id/categories` | Get all categories associated with post | Public |
| `GET` | `/api/posts/:post_id/like` | Get all likes/dislikes on post | Public |
| `POST` | `/api/posts/:post_id/like` | Vote on post (`like` / `dislike`) | Authenticated |
| `DELETE`| `/api/posts/:post_id/like` | Remove vote from post | Authenticated |

### Comments (`/api/comments`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/posts/:post_id/comments` | Get nested comments for post (sorted by likes) | Public |
| `POST` | `/api/posts/:post_id/comments` | Add comment or reply to another comment (`parent_id`) | Authenticated |
| `GET` | `/api/comments/:comment_id` | Get single comment data | Public |
| `PATCH`| `/api/comments/:comment_id` | Update status (`active` / `inactive`) | Author / Admin |
| `DELETE`| `/api/comments/:comment_id` | Delete comment | Author / Admin |
| `GET` | `/api/comments/:comment_id/like` | Get likes on comment | Public |
| `POST` | `/api/comments/:comment_id/like` | Vote on comment (`like` / `dislike`) | Authenticated |
| `DELETE`| `/api/comments/:comment_id/like` | Remove vote from comment | Authenticated |

---

## 🌟 Creative Features (Act: Creative)
1. **Favorites Hub:** Users can save important tutorials, restoration guides, or identification posts to their personal Favorites list.
2. **Profile Doll (`doll_config`):** Optional JSON of part IDs from the `doll_parts` catalog (set via `PATCH /api/users/:user_id`). With `use_doll_as_avatar: true` the doll is shown instead of the profile picture.
3. **Automated Reputation System:** User rating reflects net community value (sum of all likes minus dislikes across all posts and comments).