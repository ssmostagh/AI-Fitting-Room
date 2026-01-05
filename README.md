# AI Virtual Try-On

This project is a web application that allows users to virtually try on clothing using AI. It is built with React, Vite, TypeScript, and Tailwind CSS, and it uses the Google Gemini API to power the virtual try-on functionality.

## Features

*   Upload an image of a person and an image of a piece of clothing.
*   The AI will generate an image of the person wearing the clothing.

## Getting Started

### Prerequisites

*   Node.js and npm installed on your machine.
*   A Google Gemini API key.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://gitlab.com/google-cloud-ce/googlers/mostaghim/VTO-FBD.git
    cd VTO-FBD
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

3.  Create your own `.env` file in the root of the project. This file is not tracked by Git, so you will need to create it yourself. Add your Google Gemini API key to the file:
    ```
    VITE_GEMINI_API_KEY=your-api-key
    ```

### Running the Application

To start the development server, run:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Building for Production

To create a production build of the application, run:

```bash
npm run build
```

This will create a `dist` folder with the optimized and minified files.

## Docker

This project includes a `Dockerfile` and `nginx.conf` to build and run the application in a Docker container.

To build the Docker image, run:

```bash
docker build -t ai-virtual-try-on .
```

To run the Docker container, run:

```bash
docker run -p 8080:80 ai-virtual-try-on
```

The application will be available at `http://localhost:8080`.
