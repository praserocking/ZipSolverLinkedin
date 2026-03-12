# LinkedIn Zip Game Solver 🎮

A Chrome extension that automatically solves the LinkedIn Zip puzzle game using DFS algorithm and computer vision. Solves the daily puzzle in < 5 secs.

## ✨ Features

- **One-Click Solution**: Automatically analyzes, solves, and draws the solution
- **Smart Grid Analysis**: Detects blocks and numbered cells using image processing
- **DFS Algorithm**: Finds valid paths connecting numbers in order (1→2→3→...→8)
- **Auto-Draw**: Simulates mouse drag to draw the solution on the game

## 📦 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the `linkedin-zip-plugin` folder
5. Done! 🎉

## 🚀 Usage

1. Visit [LinkedIn Zip Game](https://www.linkedin.com/games/zip/)
2. Click the **🎯 Solve Puzzle** button (top-right corner)
3. Watch it solve automatically!

## 🛠️ How It Works

1. **Captures** the grid using html2canvas
2. **Analyzes** cells to detect numbers and blocks (walls)
3. **Solves** using DFS algorithm with constraints:
   - Connect numbers in sequential order
   - Cannot cross blocks/walls
   - Must fill all cells
   - Only 4-directional movement
4. **Draws** solution by simulating mouse drag events

## 📁 Project Structure

```
linkedin-zip-plugin/
├── manifest.json           # Extension config
├── content.js             # Main solver logic
├── html2canvas.min.js     # Screenshot library
└── tesseract.min.js       # OCR library
```

## 🐛 Troubleshooting

**Button not appearing?**
- Refresh the page and wait for grid to load

**No solution found?**
- Check console for block detection accuracy
- Puzzle might be unsolvable with current constraints

**Solution not drawing?**
- Check console for the solution path
- LinkedIn may have updated their event handling

## 🤝 Contributing

Contributions welcome! Feel free to submit issues or pull requests.

## 📝 License

MIT License - Free to use for personal and educational purposes.

## ⚠️ Disclaimer

This extension is for educational purposes. Use responsibly and in accordance with LinkedIn's terms of service.
