# 🖼️ ComfyUI Station

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![CI](https://github.com/comfy-addons/comfy-station/actions/workflows/ci-docker-hub.yml/badge.svg)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-donate-yellow.svg)](https://www.buymeacoffee.com/tctien342)

> Welcome to ComfyUI Station, your all-in-one hub for managing and enhancing your ComfyUI image generation experience! 🎨✨ This app isn't just another rendering tool; it's a powerful, user-friendly platform designed to make interacting with ComfyUI instances seamless. From workflow management to task execution, we've got you covered, making sure your creative journey is as smooth and enjoyable as possible. Let's unlock the full potential of your ComfyUI together!

![ComfyUI Station Logo or Screenshot](https://r2.550studios.com/comfy-station-bg.jpg)

## 📚 Table of Contents

- [Overview](#-overview)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Docker Installation](#docker-installation)
  - [Local Development](#local-development)
- [Usage Guide](#-usage-guide)
- [Features](#-features)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact & Support](#-contact--support)
- [Acknowledgments](#-acknowledgments)

## 🌟 Overview

ComfyUI Station is a modern, open-source application designed to streamline the management of multiple ComfyUI instances. Whether you're a seasoned AI artist or just starting out, our platform provides an intuitive interface for handling complex workflows, task scheduling, and resource management. The application is built with performance, scalability, and user experience in mind.

## 💻 Technology Stack

- **Frontend**

  - Next.js 15 with React 19
  - TypeScript for type safety
  - TailwindCSS for styling
  - Radix UI components
  - Framer Motion for animations
  - next-intl for internationalization
  - React Query for data fetching

- **Backend**

  - Bun runtime
  - Elysia for API server
  - tRPC for type-safe API communication
  - MikroORM with LibSQL for database
  - Next-Auth for authentication
  - LangChain for AI integrations

- **Development & Tools**
  - Bun as package manager
  - ESLint & Prettier for code quality
  - Docker for containerization
  - GitHub Actions for CI/CD

## 🚀 Getting Started

### Docker Installation

1. **Prerequisites**

   - Docker and Docker Compose ([Get Docker](https://www.docker.com))

2. **Configuration Files**

   Create a `.env` file:

   ```bash
   # Required
   NEXTAUTH_SECRET="your_nextauth_secret_here"
   INTERNAL_SECRET="your_internal_secret_here"

   # Optional - S3 Storage Configuration
   S3_ENDPOINT=
   S3_BUCKET_NAME=
   S3_REGION=
   S3_ACCESS_KEY=
   S3_SECRET_KEY=

   # Optional - OpenAI Integration
   OPENAI_BASE_URL=
   OPENAI_API_KEY=
   OPENAI_MODEL=
   ```

   Download nginx configuration:

   ```bash
   curl -o nginx.conf https://raw.githubusercontent.com/comfy-addons/comfy-station/refs/heads/main/nginx.conf
   ```

3. **Docker Compose Setup**

   Create `docker-compose.yml`:

   ```yml
   version: '3.8'

   services:
     nginx:
       image: nginx:alpine
       ports:
         - '8080:80'
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf:ro
       depends_on:
         - app
         - server
       networks:
         - comfy_network

     app:
       image: tctien342/comfy-station-webapp:latest
       env_file:
         - .env
       environment:
         - BE_SAME_DOMAIN=true
         - BACKEND_URL_INTERNAL=http://server:3001
         - NODE_ENV=production
       depends_on:
         - server
       restart: unless-stopped
       networks:
         - comfy_network
       expose:
         - '3000'

     server:
       image: tctien342/comfy-station-backend:latest
       env_file:
         - .env
       environment:
         - BE_SAME_DOMAIN=true
         - NODE_ENV=production
       volumes:
         - ./storage:/app/storage
       restart: unless-stopped
       networks:
         - comfy_network
       expose:
         - '3001'

   networks:
     comfy_network:
       driver: bridge
   ```

4. **Launch**

   ```bash
   docker-compose up -d
   ```

5. **Access**
   Open `http://localhost:8080` to create your first account.

### Local Development

1. **Prerequisites**

   - Bun v1.0.0 or higher ([Install Bun](https://bun.sh))
   - Node.js 18 or higher

2. **Clone & Install**

   ```bash
   git clone https://github.com/comfy-addons/comfy-station.git
   cd comfy-station
   bun install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Development Server**

   ```bash
   # Start both frontend and backend in development mode
   bun dev

   # Or start them separately
   bun dev:next     # Frontend only
   bun dev:trpc     # Backend only
   ```

5. **Available Scripts**
   - `bun dev` - Start development servers
   - `bun build` - Build for production
   - `bun start` - Start production server
   - `bun lint` - Run ESLint
   - `bun format` - Format code with Prettier
   - `bun cli` - Run CLI commands
   - `bun mikro` - MikroORM CLI commands

## 🎯 Usage Guide

1. **Initial Setup**

   - Access the application and create your first account
   - For admin access, use the first account created

2. **Managing ComfyUI Clients**

   - Login with admin account
   - Add ComfyUI servers via their URLs
   - Configure authentication if needed

3. **Working with Workflows**

   - Export workflows from ComfyUI web interface (`Workflow` -> `Export API`)
   - Upload workflows through the top bar
   - Configure workflow parameters
   - Execute tasks on connected ComfyUI nodes

4. **Task Management**

   - Monitor task progress in real-time
   - View and download generated images
   - Manage API tokens for automation

5. **User Settings**
   - Customize your account settings
   - Change password and avatar
   - Manage API tokens (Admin)

## 🎨 Features

- **Multi-Instance Management**: Connect and manage multiple ComfyUI instances seamlessly
- **Intuitive UI**: User-friendly interface for both beginners and experts
- **Real-Time Monitoring**: Track progress and status with live updates
- **Advanced Image Handling**: Preview and download generated images
- **API Token Management**: Secure programmatic access
- **AI-Powered Suggestions**: Integrated AI tools for better prompts
- **Internationalization**: Support for multiple languages
- **Resource Management**: Monitor and optimize resource usage

## 📡 API Reference

The ComfyUI Station API is built with tRPC, providing type-safe API endpoints. For detailed API documentation:

1. Start the development server
2. Access the Swagger documentation at `/api/docs`
3. Use the provided API tokens for authentication

## 👐 Contributing

1. **Fork & Clone**

   ```bash
   git clone https://github.com/your-username/comfy-station.git
   ```

2. **Branch**

   ```bash
   git checkout -b feature/your-feature
   ```

3. **Development**

   - Follow the code style guidelines
   - Add tests for new features
   - Update documentation

4. **Submit**
   - Push your changes
   - Create a Pull Request with a clear description

## 📜 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 📞 Contact & Support

- **Email**: <tctien342@gmail.com>
- **GitHub**: [tctien342](https://github.com/tctien342)
- **Issues**: [GitHub Issues](https://github.com/comfy-addons/comfy-station/issues)
- **Support**: [Buy Me a Coffee](https://www.buymeacoffee.com/tctien342)

## 💖 Acknowledgments

Special thanks to:

- The ComfyUI team
- Our amazing contributors
- The open-source community
