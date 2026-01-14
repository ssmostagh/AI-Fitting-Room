# AI Virtual Try-On

> [!IMPORTANT]
> **DEMO ONLY**: This application is provided for demonstration purposes only and is not intended for production use. It showcases the capabilities of Generative AI for virtual try-on experiences.

A web application that allows users to virtually try on clothing using AI. Built with React, Vite, TypeScript, and Tailwind CSS, utilizing the Google Gemini API for the virtual try-on functionality.

## Features

*   **Virtual Try-On (Standard)**:
    *   Upload a user photo and multiple garment images.
    *   **"Same Garment" Logic**: Intelligent consolidation of multiple views (front, back, detail) into a single garment understanding.
*   **Size & Fit Analysis (New)**:
    *   **Body Measurement Estimation**: AI analyzes the user's photo to estimate Height, Chest, Waist, and Hips.
    *   **Editable Data**: Users can fine-tune the estimated measurements for precision.
    *   **Smart Size Recommendation**: Upload a brand's size chart to get a specific size recommendation (e.g., "M") based on body data.
    *   **Size-Aware generation**: visualizing how a specific size (e.g., "L" vs "S") would actually fit (loose vs tight).
*   **AI-Powered Backend**:
    *   **Gemini 2.5 Flash**: For rapid body analysis and size logic.
    *   **Gemini 3.0 Pro Image Preview**: For high-fidelity, photorealistic try-on generation.

## Tech Stack

*   **Frontend**: React 18, Vite, TypeScript
*   **Styling**: Tailwind CSS, PostCSS
*   **AI Models**:
    *   `gemini-3-pro-image-preview` (Image Generation)
    *   `gemini-2.5-flash` (Text/JSON Analysis)
    *   `virtual-try-on` (Image Generation)
*   **SDK**: Google GenAI SDK (`@google/genai`)

## Getting Started

### Prerequisites

*   Node.js (v18+ recommended)
*   npm
*   A Google Gemini API key used for the VTO generation.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ssmostagh/AI-Fitting-Room.git
    cd AI-Fitting-Room
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
-   **Architecture:** Docker images should always be built for `amd64/linux`.

1.  **Build the image:**
    ```bash
    docker build -t ai-virtual-try-on .
    ```

2.  **Run the container:**
    ```bash
    docker run -p 8080:80 ai-virtual-try-on
    ```

    The app will be accessible at [http://localhost:8080](http://localhost:8080).
