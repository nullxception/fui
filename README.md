# fui

Web UI for [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp)

![preview](https://github.com/user-attachments/assets/77fc9e5c-1a2c-4fe1-9023-32fc9d7014d7)

## Prerequisites

- **[Bun](https://bun.sh/)** as a runtime and package manager.
- **[stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp)**: You can place `sd-cli` binary from `stable-diffusion.cpp` in:
  - `bin` directory inside `fui`
  - `fui` root directory, or
  - system's `$PATH`.

## Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/nullxception/fui.git
    cd fui
    ```

2.  Install dependencies:
    ```bash
    bun install
    ```

## Usage

### Production

To run the application in production mode:

```bash
bun start
```

### Development Server

To start the development server with hot reloading:

```bash
bun dev
```

The application will be available at `http://localhost:5141`.

## Configuration

In order to customize the application settings, you can create a `.env` file in the root directory. Simply copy the example file:

```bash
cp .env.example .env
```

### Available Settings

| Variable         | Default    |
| ---------------- | ---------- |
| `PORT`           | `5141`     |
| `FUI_MODELS_DIR` | `./models` |

### Directory Layout

The application will automatically organize your files in this structure:

```
models/           # Your models collection (you can customize this path)
 ├─ checkpoint/   # Main model files
 ├─ embedding/    # Text embedding models
 ├─ llm/          # LLM
 ├─ lora/         # LoRA style files
 ├─ tae/          # TinyAutoEncoder models
 ├─ textencoder/  # Text encoder models
 ├─ upscaler/     # Image upscaling models
 └─ vae/          # VAE enhancement files

output/           # Your generated images (created automatically)
 └─ txt2img/      # Text-to-image creations

upload/           # Files you upload from the web UI (created automatically)

config.yaml       # Your app preferences (created automatically when configuring from the web UI)
```
