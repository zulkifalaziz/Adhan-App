# Adhan App

An Electron application that displays prayer times and plays the Adhan.

## Installation and Running

1.  Clone the repository:
    ```bash
    git clone https://github.com/USERNAME/adhan-app.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd adhan-app
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Run the application:
    ```bash
    npm start
    ```

## Project Structure

*   `main.js`: The main Electron process.
*   `index.html`: The main HTML file for the application.
*   `renderer.js`: The JavaScript file for the renderer process.
*   `style.css`: The CSS file for styling the application.
*   `assets/`: Contains static assets like images and audio files.
*   `main-process/`: Contains modules for the main Electron process.
*   `src/`: Contains the source CSS file for Tailwind CSS.

## Building

To build the application for production, run:

```bash
npm run build
```

This will create a minified CSS file in the `style.css` file. You can then use a tool like Electron Packager or Electron Builder to package the application.

## License

This project is licensed under the ISC License.
