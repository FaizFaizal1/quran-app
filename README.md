# Quran Looping App

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-stable-success)

A premium, web-based memorization tool designed to help users loop specific verses or ranges of the Quran. Built with Vanilla JS and CSS variables for a lightweight, fast, and responsive experience.

## Features

- **Premium UI**: Dark mode, glassmorphism design, and mobile-responsive layout.
- **Advanced Looping**:
    - **Verse Repeat**: Repeat individual verses $N$ times.
    - **Range Repeat**: Repeat a sequence of verses $M$ times.
- **High Quality Audio**: Integrates with [EveryAyah](https://everyayah.com) for verse-by-verse streaming.
- **Rich Content**: Detailed metadata for all 114 Surahs via [Quran.com API](https://api.quran.com/).

## Quick Start

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/quran-app.git
    cd quran-app
    ```

2.  **Open in Browser**
    Since this is a static site, you can simply open `index.html` in your browser.
    
    OR use a simple specific server:
    ```bash
    npx serve .
    ```

## Development

### Project Structure
- `index.html`: Main entry point and UI structure.
- `style.css`: All styles (variables, responsive design, animations).
- `app.js`: Core logic (State, API, Audio Engine).
- `tests/`: Browser-based test suite.

### Running Tests
Open `tests/test.html` in your browser to run the logic verification suite.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License.
