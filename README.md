# 🖼️ ComfyUI Station

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![CI](https://github.com/comfy-addons/comfy-station/actions/workflows/ci-docker-hub.yml/badge.svg)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-donate-yellow.svg)](https://www.buymeacoffee.com/tctien342)

> Welcome to ComfyUI Station, your all-in-one hub for managing and enhancing your ComfyUI image generation experience! 🎨✨ This app isn't just another rendering tool; it's a powerful, user-friendly platform designed to make interacting with ComfyUI instances seamless. From workflow management to task execution, we've got you covered, making sure your creative journey is as smooth and enjoyable as possible. Let's unlock the full potential of your ComfyUI together!

![ComfyUI Station Logo or Screenshot](https://r2.550studios.com/comfy-station-bg.jpg)

## 🗺️ Navigation Menu

- [Project Title & Description](#project-title--description)
- [Installation](#installation)
- [How to Use](#how-to-use)
- [Features](#features)
- [Contributing](#contributing)
- [License](#license)
- [Contact Info](#contact-info)
- [Acknowledgments](#acknowledgments)

## 🌟 Project Title & Description

### ✨ ComfyUI Station: Your Creative Control Center

ComfyUI Station is your go-to open-source application for interacting with and managing multiple ComfyUI instances. 😎 It's designed to make complex workflows accessible and fun. Whether you're a seasoned AI artist or just starting out, this app simplifies the process of image generation, letting you focus on your creativity, not the hassle. 🖼️⚙️ It's all about making ComfyUI more user-friendly and powerful, providing you with a station that handles everything from task scheduling to resource management.

## 🛠 Installation

Ready to get started? Here's how to set up ComfyUI Station:

1.  **Prerequisites:** 📝

    - **Docker:** Docker and Docker Compose is needed for containerization. Get it at [https://www.docker.com](https://www.docker.com).

2.  **Docker compose file** 📥

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

3.  **Set up your `.env` file:** ⚙️
    Copy content below to your `.env` and fill in your details.

    ```bash
    # Secret key for NextAuth authentication
    NEXTAUTH_SECRET="your_nextauth_secret_here"

    # Backend and frontend internal secret
    INTERNAL_SECRET="your_internal_secret_here"
    
    # S3 storage configuration (Optional - Storage file on S3 services)
    S3_ENDPOINT=
    S3_BUCKET_NAME=
    S3_REGION=
    S3_ACCESS_KEY=
    S3_SECRET_KEY=
    
    # Support for OpenAI (Optional - Auto fill input feature)
    OPENAI_BASE_URL=
    OPENAI_API_KEY=
    OPENAI_MODEL=
    ```

    You will need:

    - `NEXTAUTH_SECRET`
    - `INTERNAL_SECRET`
    - Your S3 credentials (optional): `S3_ENDPOINT`, `S3_BUCKET_NAME`, etc.
      - If you don't have S3 credentials, don't fill these fields, the app will use local storage.
    - Your OpenAI credentials (optional): `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`

4.  **Download `nginx` config file:** 📥

    ```bash
    curl -o nginx.conf https://raw.githubusercontent.com/comfy-addons/comfy-station/refs/heads/main/nginx.conf
    ```

5.  **Start with Docker Compose:** 🐳

        ```bash
        docker-compose up -d
        ```

7.  **Access the Application:** 🌐
        Open your browser and go to `http://localhost:8080` to create your first account.

## 🚀 How to Use

Getting started with ComfyUI Station is a breeze:

1.  **Login:** Access the application at `http://localhost:3000` and sign in using your username and password, or an existing API token.
2.  **Add a ComfyUI Client:**
    - Login with admin account and add your ComfyUI server by its URL.
    - Input any necessary authentication.
3.  **Start Creating Workflows:**
    - Download your workflow from ComfyUI web interface using `Workflow` -> `Export API`.
    - Upload your own in the top bar.
    - Select a workflow to run from the main workflow picker
    - Use the workflow parameters area to adjust the input configuration.
    - Click "Run" to start the task on one of your connected ComfyUI nodes.
4.  **Manage and Monitor:**
    - Track the status of running tasks.
    - View and download generated images.
    - Manage your API tokens for secure access to the API.
5.  **Settings:**
    - In the setting menu, you can manage your user account such as change password and avatar.
    - Admin can manage their users and API tokens

## 🎨 Features

- **Multi-Instance Management**: Connect and manage multiple ComfyUI instances seamlessly. 🔗
- **Intuitive UI**: Enjoy a user-friendly interface designed for both beginners and experts. ✨
- **Real-Time Monitoring:** Track the progress and status of your tasks and connected ComfyUI nodes with real-time updates. 📊
- **Advanced Image Handling**: Preview, and download your generated images with ease. 🖼️
- **API Token Management**: Securely generate and manage API tokens for programmatic interaction. 🔑
- **AI Suggestion for prompt**: Use integrated AI tool for better prompt. 🧙

## 👐 Contributing

We welcome contributions! Here's how you can help improve ComfyUI Station:

1.  **Fork the Repository:** 🍴
    Start by forking the project repository on GitHub.

2.  **Create a Branch:** 🌿
    Create a new branch for your changes: `git checkout -b feature/your-new-feature`.

3.  **Make Your Changes:** 💻
    Make sure to follow the existing code style.

4.  **Test Your Changes:** ✅
    Ensure your changes don't break anything by testing them thoroughly.

5.  **Submit a Pull Request:** 🚀
    Submit a pull request to the main branch when you're ready, including a brief summary of the changes and their purpose.

## 📜 License

ComfyUI Station is released under the MIT License. 📄 This means you have the freedom to use, modify, and distribute the software, as long as you include the original copyright and license notice. Please see the `LICENSE` file for details.

## 📞 Contact Info

Have questions or need support? Feel free to reach out!

- **Email:** tctien342@gmail.com
- **GitHub:** [https://github.com/tctien342](https://github.com/tctien342)

## 💖 Acknowledgments

A huge thanks to everyone who inspired this project and provided support, especially:

- The ComfyUI team.
- The open-source community for its inspiration.
- All contributors to the project! 🙌
