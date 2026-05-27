# Python Email Client

A Python-based email client application.

## Overview

This project is an email client built with Python. It provides a web-based user interface for managing and sending emails, utilizing Python's web frameworks and templates.

## Features

- User-friendly interface for reading and sending emails.
- Built using Python, pywebview, and web technologies (HTML, CSS, JS).
- Packaged as a standalone executable.

## Installation

### Prerequisites

- Python 3.x installed on your system.

### Setup Instructions

1. Clone the repository to your local machine.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: ensure all dependencies are installed)*

## Building the Executable

You can build a standalone executable for this application using PyInstaller.

Run the following command in your terminal:

```bash
.\venv\Scripts\pyinstaller.exe --noconfirm --onefile --windowed --add-data "templates;templates/" --add-data "static;static/" --name "MailClient" app.py
```

Alternatively, you can run the provided `build.ps1` script if you are on Windows.

## Usage

After running the application (e.g., `python app.py`) or building the executable, launch `MailClient` to start using the email client interface. Ensure any required environment variables (like those in `.env`) are configured before running.

## License

This project is open-source and available under the MIT License.