# Togen

A quick note utility made in Electron.

![preview](preview.png)
![Light Mode](lightmode.png)
## Features

- Global shortcut for the note window.
- Dark/Light, semi‑transparent background with light/Dark text.
- Clipboard Functions (Copy,Paste,Cut).
- Slots: There are 3 slots where 2 and 3 are persistent and 1 is temporary
- Light/Dark Mode
- Demo To try it out [Here](https://melodelete.github.io/Togen/)

## Installation
1. Install Your Platform Installation Type from [releases](https://github.com/melodelete/Togen/releases)
2. Grant Permissions To Run
3. Enjoy

## Usage
- Press **Ctrl + `** (backtick) to toggle the note window.
- Type your note inside the textarea.
- Use **Ctrl + C** to copy.
- Use **Ctrl + V** to paste.
- Click outside the window (Lose Focus) or press **Escape** to hide it.
- **Ctrl+1/2/3** To Change Slots
- **Ctrl+L/D** To change theme
- **Ctrl+S** To save note as text file

## Development
1. Clone this repository.
   ```bash
   git clone https://github.com/melodelete/Togen.git
   ```
2. cd to the project folder:
   ```bash
   cd path/to/togen
   ```
3. Install Electron (dependency):
   ```bash
   npm install
   ```
## Project Structure

```
Togen/
├── main.js          # Electron's main process
├── preload.js       # Bridge TO The Renderer
├── index.html       # UI/Demo
├── package.json     # npm metadata and start script
```

## License

MIT © MeloDelete

## AI Declarence

AI was used to optimize code, to review bugs, For Ideas, This Readme.md was written by AI but has been rewritten,and Helped Setup the demo

## Ideas
E for Electron App Only (Not a demo feature)
- ~~Persistent Notes (Auto-save / Restore)~~
- ~~Multiple Notes / Slots~~
- ~~Theme Switcher (Light / Dark / System)~~
- Pin Note to Screen Edge (E)
- Quick-Insert Snippets
- Sound / Visual Feedback 
- Tray / Menu Bar Icon (E)
- Settings Window (E)
- Drag-to-Move
- ~~Save as Text (E)~~
- Integration with Other Apps
- Secure / Encrypted Notes
- ~~OS support~~

