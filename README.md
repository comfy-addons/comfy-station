# 🖼️ ComfyUI Station

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

    - **Bun:** Ensure you have Bun installed. You can download it from [https://bun.sh](https://bun.sh).
    - **Docker:** Docker is needed for containerization. Get it at [https://www.docker.com](https://www.docker.com).

2.  **Clone the Repository:** 📥

    ```bash
    git clone https://github.com/comfy-addons/comfy-station.git
    cd comfy-addons-comfy-station
    ```

3.  **Set up your `.env` file:** ⚙️
    Copy `.env.example` to `.env` and fill in your details.

    ```bash
    cp .env.example .env
    # now open .env and update with your details
    ```

    You will need:

    - `NEXTAUTH_SECRET`
    - `BACKEND_URL`
    - `INTERNAL_SECRET`
    - Your S3 credentials (optional): `S3_ENDPOINT`, `S3_BUCKET_NAME`, etc.
      - If you don't have S3 credentials, don't fill these fields, the app will use local storage.
    - Your OpenAI credentials (optional): `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`

    4.  **Create Your First Account:** 👤

        - Create an Admin (Level 5) user with the following command:
          ```bash
          bun cli user --email admin@example.com -p admin1234 -l 5
          ```
        - There are different user levels:
          - Editor (Level 4) user, who can only create and execute workflows: `-l 4`
          - User (Level 3) user, who can only execute workflows: `-l 3`

    5.  **Build with Docker Compose:** 🐳

        ```bash
        docker-compose up --build
        ```

    6.  **Access the Application:** 🌐
        Open your browser and go to `http://localhost:3000`.

## 🚀 How to Use

Getting started with ComfyUI Station is a breeze:

1.  **Login:** Access the application at `http://localhost:3000` and sign in using your username and password, or an existing API token.
2.  **Add a ComfyUI Client:**
    - Go to the admin panel and add your ComfyUI server by its URL.
    - Input any necessary authentication.
3.  **Start Creating Workflows:**
    - Select a workflow to run from the main workflow picker or upload your own in the top bar.
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
- **Workflow Scheduling**: Plan and schedule your rendering tasks for optimal resource use. 📅
- **Real-Time Monitoring:** Track the progress and status of your tasks and connected ComfyUI nodes with real-time updates. 📊
- **Advanced Image Handling**: Preview, and download your generated images with ease. 🖼️
- **API Token Management**: Securely generate and manage API tokens for programmatic interaction. 🔑
- **Open Source**: Contribute and customize your experience with an open-source tool. 🛠️
- **Multi-language support**: Support EN and VI language. 🌍
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
