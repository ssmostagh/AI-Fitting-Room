# AI Virtual Try-On

> [!IMPORTANT]
> **DEMO ONLY**: This application is provided for demonstration purposes only and is not intended for production use. It showcases the capabilities of Generative AI for virtual try-on experiences.

A web application that allows users to virtually try on clothing using AI. Built with React, Vite, TypeScript, and Tailwind CSS, utilizing the Google Gemini API for the virtual try-on functionality.

## Features

*   **Virtual Try-On**: Upload a user image and a garment image to generate a try-on result.
*   **AI-Powered**: Uses Google's Gemini models for high-quality image generation.
*   **Modern UI**: Built with React and Tailwind CSS for a responsive experience.

## Tech Stack

*   **Frontend**: React, Vite, TypeScript
*   **Styling**: Tailwind CSS
*   **AI**: Google Gemini API (`@google/genai`)

## Getting Started

### Prerequisites

*   Node.js (v18+ recommended)
*   npm
*   A Google Gemini API key used for the VTO generation.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://gitlab.com/google-cloud-ce/googlers/mostaghim/VTO-FBD.git
    cd VTO-FBD
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    ```

### Running the Application

To start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Building for Production

To create a production build:

```bash
npm run build
```

This generates a `dist` folder with optimized assets.

## Docker Support

You can also run the application using Docker.

1.  **Build the image:**
    ```bash
    docker build -t ai-virtual-try-on .
    ```

2.  **Run the container:**
    ```bash
    docker run -p 8080:80 ai-virtual-try-on
    ```

    The app will be accessible at [http://localhost:8080](http://localhost:8080).
