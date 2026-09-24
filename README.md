# 💣 Bomberman Arcade Classic

A fully featured, retro arcade **Bomberman** game built with modern HTML5 Canvas, JavaScript, and the Web Audio API (zero external assets or dependencies!).

---

## 🕹️ Game Features

* **Authentic Grid & Mechanics**:
  * 15×13 classic Bomberman arena layout with indestructible pillar walls and destructible soft bricks.
  * **Smooth Corner-Sliding Movement**: Automatically guides the character around corners when slightly offset, preserving the authentic feel of the classic game.
  * **Bomb Physics**: Drop bombs, walk off them safely before they become solid, and chain-react nearby explosives!
  * **Destructible Environment**: Blast bricks to uncover secret power-ups and the stage exit door.

* **Game Modes**:
  * **1-Player Campaign**: Fight through progressive stages (Grass Arena, Dungeon Arena, Volcano Arena) with increasing monster counts, hidden exit doors, stage timer countdown, lives, and high-score tracking.
  * **2-Player Local Battle**: Duel against a friend on the same keyboard in a sudden-death round-based PvP showdown (First to 3 wins)!

* **Enemies & Monsters (AI)**:
  * 🎈 **Balloom**: Classic wandering orange monster.
  * 💧 **Oneal**: Fast blue monster with line-of-sight pursuit.
  * 👻 **Kondoria**: Ghost phantom that can phase through destructible bricks!

* **Power-Ups**:
  * 💣 **Bomb Up**: +1 Simultaneous bomb capacity.
  * 🔥 **Fire Up**: +1 Explosion blast radius in all 4 cardinal directions.
  * ⚡ **Speed Up**: Increases movement speed.
  * 🛡️ **Shield**: 10 seconds of invulnerability.
  * 👟 **Bomb Kick**: Walk into bombs to slide them across the arena.
  * 📡 **Remote Detonator**: Detonate your oldest bomb at will!

* **8-Bit Sound & Chiptune Music**:
  * Pure procedural sound synthesized via the **Web Audio API**: bomb drops, ticking fuses, explosions, powerup arpeggios, monster defeat chirps, and retro chiptune background music.

* **Responsive & Mobile Friendly**:
  * Full-size arcade view on desktop and on-screen virtual touch D-pad & action buttons for mobile/touchscreen play.

---

## 🎮 Controls

### Player 1 (White Bomberman)
| Action | Keyboard | Touchscreen |
| :--- | :--- | :--- |
| **Move Up / Down / Left / Right** | <kbd>W</kbd> <kbd>S</kbd> <kbd>A</kbd> <kbd>D</kbd> | On-Screen D-Pad |
| **Drop Bomb** | <kbd>Space</kbd> | 💣 Button |
| **Remote Detonate** | <kbd>E</kbd> | 📡 Button |

### Player 2 (Black Bomberman - 2-Player Battle)
| Action | Keyboard |
| :--- | :--- |
| **Move Up / Down / Left / Right** | <kbd>▲</kbd> <kbd>▼</kbd> <kbd>◀</kbd> <kbd>▶</kbd> |
| **Drop Bomb** | <kbd>Enter</kbd> |
| **Remote Detonate** | <kbd>Right Shift</kbd> |

### System Keys
* <kbd>P</kbd> or <kbd>Esc</kbd>: Pause / Resume Game

---

## 🚀 How to Run Locally

You can run a local HTTP server using Python or Node:

```bash
# Using Python
python3 -m http.server 8080

# Or open index.html directly in any modern browser!
```

Open `http://localhost:8080` in your web browser to play!